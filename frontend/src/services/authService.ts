import type { SignedPersonalMessage } from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";

/**
 * Very small (no-dependency) JWT payload decoder – **NOT** a verifier, just reads the `exp` claim.
 */
function decodeJwtExp(token: string): number | null {
	try {
		const [, payload] = token.split(".");
		const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
		const { exp } = JSON.parse(json);
		return typeof exp === "number" ? exp * 1000 : null;
	} catch {
		return null;
	}
}

const BACKEND_SERVICE_HOST = import.meta.env.VITE_BACKEND_SERVICE_HOST;
const TOKEN_KEY = "sui_airbnb_auth_token";
const USER_KEY = "sui_airbnb_user";
const REFRESH_KEY = "sui_airbnb_refresh_token";

export interface AuthToken {
	token: string;
	/** unix epoch (ms) */
	expiresAt: number;
}

export interface User {
	address: string;
	role: string;
}

export interface AuthState {
	token: AuthToken | null;
	user: User | null;
	isAuthenticated: boolean;
}

/**
 * Service for handling authentication operations (browser-only).
 */
class AuthService {
	private token: AuthToken | null = null;
	private refreshToken: string | null = null;
	private user: User | null = null;
	private refreshingPromise: Promise<boolean> | null = null;

	constructor() {
		this.loadFromStorage();

		// cross-tab sync
		window.addEventListener("storage", (e) => {
			if ([TOKEN_KEY, USER_KEY, REFRESH_KEY].includes(e.key ?? "")) {
				this.loadFromStorage();
			}
		});
	}

	/* ───────────────── persistence ───────────────── */
	private loadFromStorage() {
		try {
			const tokenStr = localStorage.getItem(TOKEN_KEY);
			const refreshStr = localStorage.getItem(REFRESH_KEY);
			const userStr = localStorage.getItem(USER_KEY);

			this.token = tokenStr ? (JSON.parse(tokenStr) as AuthToken) : null;
			this.refreshToken = refreshStr ?? null;
			this.user = userStr ? (JSON.parse(userStr) as User) : null;

			// Drop expired token if still hanging around
			if (this.token && this.token.expiresAt <= Date.now()) {
				this.token = null;
				localStorage.removeItem(TOKEN_KEY);
			}
		} catch (err) {
			console.error("AuthService: loadFromStorage failed", err);
			this.clearStorage();
		}
	}

	private saveToStorage() {
		if (this.token) localStorage.setItem(TOKEN_KEY, JSON.stringify(this.token));
		if (this.user) localStorage.setItem(USER_KEY, JSON.stringify(this.user));
		if (this.refreshToken) localStorage.setItem(REFRESH_KEY, this.refreshToken);
	}

	private clearStorage() {
		localStorage.removeItem(TOKEN_KEY);
		localStorage.removeItem(USER_KEY);
		localStorage.removeItem(REFRESH_KEY);
		this.token = this.refreshToken = this.user = null;
	}

	/* ───────────────── getters ───────────────── */
	isAuthenticated(): boolean {
		return !!this.token && this.token.expiresAt > Date.now();
	}

	getUser(): User | null {
		return this.user;
	}

	getToken(): string | null {
		// biome-ignore lint/style/noNonNullAssertion: <explanation>
		return this.isAuthenticated() ? this.token!.token : null;
	}

	getAuthHeaders(): Record<string, string> {
		const t = this.getToken();
		return t ? { Authorization: `Bearer ${t}` } : {};
	}

	/* ───────────────── server helpers ───────────────── */
	async getNonce(address?: string): Promise<string> {
		const url = address
			? `${BACKEND_SERVICE_HOST}/api/auth/nonce?address=${address}`
			: `${BACKEND_SERVICE_HOST}/api/auth/nonce`;
		const res = await fetch(url);
		if (!res.ok) throw new Error("Failed to get nonce");
		const { nonce } = await res.json();
		return nonce;
	}

	constructChallengeMessage(address: string, nonce: string): string {
		return JSON.stringify({
			app: "Web3 Airbnb on Sui",
			domain: window.location.hostname,
			address,
			statement: "Sign in to Web3 Airbnb with your Sui account.",
			version: "1",
			nonce,
			timestamp: new Date().toISOString(),
		});
	}

	/**
	 * Complete the sign-in after wallet signature.
	 */
	async login(
		message: string,
		signature: SignedPersonalMessage["signature"],
		publicKey: WalletAccount["publicKey"],
	): Promise<User> {
		const res = await fetch(`${BACKEND_SERVICE_HOST}/api/auth/login`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ message, signature, publicKey }),
		});

		if (!res.ok) {
			this.clearStorage();
			throw new Error("Authentication failed");
		}

		const data = await res.json();
		const exp = decodeJwtExp(data.token) ?? Date.now() + 24 * 3600 * 1000;

		this.token = { token: data.token, expiresAt: exp };
		this.refreshToken = data.refreshToken;
		this.user = data.user as User;
		this.saveToStorage();
		return this.user as User;
	}

	logout(): void {
		this.clearStorage();
	}

	/* ───────────────── refresh flow ───────────────── */
	private willExpireWithin(ms: number): boolean {
		return this.token ? this.token.expiresAt - Date.now() < ms : false;
	}

	needsRefresh(): boolean {
		return this.willExpireWithin(15 * 60 * 1000);
	}

	/**
	 * Refresh the access token using the refresh token – only one concurrent call.
	 */
	async refreshAuthToken(): Promise<boolean> {
		if (!this.refreshToken) return false;
		if (this.refreshingPromise) return this.refreshingPromise;

		this.refreshingPromise = (async () => {
			try {
				const res = await fetch(
					`${BACKEND_SERVICE_HOST}/api/auth/refresh-token`,
					{
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ refreshToken: this.refreshToken }),
						credentials: "include", // allows cookie-based refresh later
					},
				);
				if (!res.ok) throw new Error("Refresh failed");
				const data = await res.json();
				const exp = decodeJwtExp(data.token) ?? Date.now() + 24 * 3600 * 1000;
				this.token = { token: data.token, expiresAt: exp };
				if (data.user) this.user = data.user;
				this.saveToStorage();
				return true;
			} catch (err) {
				console.error("AuthService: refresh failed", err);
				this.clearStorage();
				return false;
			} finally {
				this.refreshingPromise = null;
			}
		})();

		return this.refreshingPromise;
	}

	async refreshIfNeeded(): Promise<boolean> {
		return this.needsRefresh() ? this.refreshAuthToken() : false;
	}
}

const authService = new AuthService();
export default authService;
