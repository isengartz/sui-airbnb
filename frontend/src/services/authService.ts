import type { SignedPersonalMessage } from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";

const BACKEND_SERVICE_HOST = import.meta.env.VITE_BACKEND_SERVICE_HOST;
const LOCAL_STORAGE_TOKEN_KEY = "sui_airbnb_auth_token";
const LOCAL_STORAGE_USER_KEY = "sui_airbnb_user";
const LOCAL_STORAGE_REFRESH_TOKEN_KEY = "sui_airbnb_refresh_token";

export interface AuthToken {
	token: string;
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
 * Service for handling authentication operations
 */
class AuthService {
	private token: AuthToken | null = null;
	private refreshToken: string | null = null;
	private user: User | null = null;

	constructor() {
		this.loadFromStorage();
	}

	// Load auth state from local storage
	private loadFromStorage() {
		try {
			const tokenStr = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
			const userStr = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
			const refreshTokenStr = localStorage.getItem(
				LOCAL_STORAGE_REFRESH_TOKEN_KEY,
			);

			if (tokenStr) {
				const token = JSON.parse(tokenStr) as AuthToken;
				// Check if token is expired
				if (token.expiresAt > Date.now()) {
					this.token = token;
				} else {
					// Token is expired, but we might have a refresh token
					this.token = null;
				}
			}

			if (refreshTokenStr) {
				this.refreshToken = refreshTokenStr;
			}

			if (userStr) {
				this.user = JSON.parse(userStr) as User;
			}
		} catch (error) {
			console.error("Failed to load auth state from storage:", error);
			this.clearStorage();
		}
	}

	// Save auth state to local storage
	private saveToStorage() {
		if (this.token) {
			localStorage.setItem(LOCAL_STORAGE_TOKEN_KEY, JSON.stringify(this.token));
		}
		if (this.user) {
			localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(this.user));
		}
		if (this.refreshToken) {
			localStorage.setItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY, this.refreshToken);
		}
	}

	// Clear auth state from storage
	private clearStorage() {
		localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);
		localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
		localStorage.removeItem(LOCAL_STORAGE_REFRESH_TOKEN_KEY);
		this.token = null;
		this.refreshToken = null;
		this.user = null;
	}

	// Check if user is authenticated
	isAuthenticated(): boolean {
		return !!this.token && this.token.expiresAt > Date.now();
	}

	// Get current user
	getUser(): User | null {
		return this.user;
	}

	// Get authentication token
	getToken(): string | null {
		if (this.token && this.token.expiresAt > Date.now()) {
			return this.token.token;
		}
		return null;
	}

	// Get authentication headers
	getAuthHeaders(): Record<string, string> {
		const token = this.getToken();
		return token ? { Authorization: `Bearer ${token}` } : {};
	}

	// Request a nonce from the server
	async getNonce(address?: string): Promise<string> {
		const url = address
			? `${BACKEND_SERVICE_HOST}/api/auth/nonce?address=${address}`
			: `${BACKEND_SERVICE_HOST}/api/auth/nonce`;
		console.log("getNonce", url);
		const response = await fetch(url);
		if (!response.ok) {
			throw new Error("Failed to get nonce");
		}
		const data = await response.json();
		return data.nonce;
	}

	// Construct a challenge message
	constructChallengeMessage(address: string, nonce: string): string {
		console.log("constructChallengeMessage", address, nonce);
		const message = JSON.stringify({
			app: "Web3 Airbnb on Sui",
			domain: window.location.hostname,
			address,
			statement: "Sign in to Web3 Airbnb with your Sui account.",
			version: "1",
			nonce,
			timestamp: new Date().toISOString(),
		});

		return message;
	}

	async login(
		message: string,
		signature: SignedPersonalMessage["signature"],
		publicKey: WalletAccount["publicKey"],
	): Promise<User> {
		try {
			console.log("login from service");
			console.log(message, signature, publicKey);
			// Send the signature to the server for verification
			const response = await fetch(`${BACKEND_SERVICE_HOST}/api/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					message,
					signature,
					publicKey,
				}),
			});

			if (!response.ok) {
				throw new Error("Authentication failed");
			}

			const data = await response.json();
			console.log(data);
			// Store the token and user information
			this.token = {
				token: data.token,
				expiresAt: Date.now() + this.parseExpiresIn(data.expiresIn),
			};
			this.refreshToken = data.refreshToken;
			this.user = data.user as User;

			// Save to storage
			this.saveToStorage();

			return this.user;
		} catch (error) {
			console.error("Login failed:", error);
			this.clearStorage();
			throw error;
		}
	}

	// Logout
	logout(): void {
		this.clearStorage();
	}

	// Parse expiresIn string to milliseconds
	private parseExpiresIn(expiresIn: string): number {
		// Default to 24 hours if parsing fails
		const defaultExpiry = 24 * 60 * 60 * 1000;

		if (!expiresIn) return defaultExpiry;

		try {
			const unit = expiresIn.slice(-1);
			const value = Number.parseInt(expiresIn.slice(0, -1));

			if (Number.isNaN(value)) return defaultExpiry;

			switch (unit) {
				case "s":
					return value * 1000; // seconds
				case "m":
					return value * 60 * 1000; // minutes
				case "h":
					return value * 60 * 60 * 1000; // hours
				case "d":
					return value * 24 * 60 * 60 * 1000; // days
				default:
					return defaultExpiry;
			}
		} catch (error) {
			console.error("Failed to parse expiresIn:", error);
			return defaultExpiry;
		}
	}

	// Check if token needs refresh
	needsRefresh(): boolean {
		if (!this.token) return false;

		// Refresh if token expires in less than 15 minutes
		const refreshThreshold = 15 * 60 * 1000; // 15 minutes in milliseconds
		return this.token.expiresAt - Date.now() < refreshThreshold;
	}

	// Refresh token using refresh token
	async refreshAuthToken(): Promise<boolean> {
		if (!this.refreshToken) {
			return false;
		}

		try {
			const response = await fetch(
				`${BACKEND_SERVICE_HOST}/api/auth/refresh-token`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						refreshToken: this.refreshToken,
					}),
				},
			);

			if (!response.ok) {
				throw new Error("Token refresh failed");
			}

			const data = await response.json();

			// Update token
			this.token = {
				token: data.token,
				expiresAt: Date.now() + this.parseExpiresIn(data.expiresIn),
			};

			// Update user if returned
			if (data.user) {
				this.user = data.user;
			}

			// Save to storage
			this.saveToStorage();

			return true;
		} catch (error) {
			console.error("Token refresh failed:", error);

			// If refresh fails with an auth error, clear auth state
			// But keep refresh token for potential future retries
			this.token = null;
			localStorage.removeItem(LOCAL_STORAGE_TOKEN_KEY);

			return false;
		}
	}

	// Refresh token if needed
	async refreshIfNeeded(): Promise<boolean> {
		if (this.needsRefresh() && this.refreshToken) {
			return await this.refreshAuthToken();
		}
		return false;
	}
}

const authService = new AuthService();
export default authService;
