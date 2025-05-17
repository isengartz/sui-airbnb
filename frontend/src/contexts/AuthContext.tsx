import { useCurrentAccount, useSignPersonalMessage } from "@mysten/dapp-kit";
import type { WalletAccount } from "@mysten/wallet-standard";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import authService, { type AuthState } from "../services/authService";

// ────────────────────────────────────────────────────────────────────────────

const defaultState: AuthState = {
	token: null,
	user: null,
	isAuthenticated: false,
};

interface AuthCtxValue {
	authState: AuthState;
	login: () => Promise<void>;
	loginWithWallet: (
		address: string,
		publicKey: WalletAccount["publicKey"],
	) => Promise<void>;
	logout: () => void;
	isAdmin: () => boolean;
	isAgent: () => boolean;
}

const AuthContext = createContext<AuthCtxValue>({
	authState: defaultState,
	login: async () => {},
	loginWithWallet: async () => {},
	logout: () => {},
	isAdmin: () => false,
	isAgent: () => false,
});

// ────────────────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const currentAccount = useCurrentAccount();
	const { mutate: signPersonalMessage } = useSignPersonalMessage();

	const [authState, setAuthState] = useState<AuthState>({
		token: authService.getToken()
			? // biome-ignore lint/style/noNonNullAssertion: <explanation>
				{ token: authService.getToken()!, expiresAt: 0 }
			: null,
		user: authService.getUser(),
		isAuthenticated: authService.isAuthenticated(),
	});

	const updateAuthState = useCallback(() => {
		setAuthState({
			token: authService.getToken()
				? // biome-ignore lint/style/noNonNullAssertion: <explanation>
					{ token: authService.getToken()!, expiresAt: 0 }
				: null,
			user: authService.getUser(),
			isAuthenticated: authService.isAuthenticated(),
		});
	}, []);

	/* initial load */
	useEffect(() => {
		updateAuthState();
	}, [updateAuthState]);

	/* periodic refresh check */
	useEffect(() => {
		let id: number | undefined;
		if (authService.isAuthenticated()) {
			authService.refreshIfNeeded().then(updateAuthState);
			id = window.setInterval(
				async () => {
					const ok = await authService.refreshIfNeeded();
					if (ok) updateAuthState();
				},
				5 * 60 * 1000,
			);
		}
		return () => clearInterval(id);
	}, [updateAuthState]);

	useEffect(() => {
		if (currentAccount && authService.isAuthenticated()) updateAuthState();
	}, [currentAccount, updateAuthState]);

	const loginWithWallet = useCallback(
		async (address: string, publicKey: WalletAccount["publicKey"]) => {
			const nonce = await authService.getNonce(address);
			const message = authService.constructChallengeMessage(address, nonce);

			await new Promise<void>((resolve, reject) => {
				signPersonalMessage(
					{ message: new TextEncoder().encode(message) },
					{
						onSuccess: async (result) => {
							try {
								await authService.login(message, result.signature, publicKey);
								updateAuthState();
								resolve();
							} catch (err) {
								reject(err);
							}
						},
						onError: reject,
					},
				);
			});
		},
		[signPersonalMessage, updateAuthState],
	);

	const login = useCallback(async () => {
		if (!currentAccount) throw new Error("No wallet connected");
		await loginWithWallet(currentAccount.address, currentAccount.publicKey);
	}, [currentAccount, loginWithWallet]);

	const logout = () => {
		authService.logout();
		updateAuthState();
	};

	const isAdmin = () => authState.user?.role === "admin";
	const isAgent = () => authState.user?.role === "agent";

	return (
		<AuthContext.Provider
			value={{
				authState,
				login,
				loginWithWallet,
				logout,
				isAdmin,
				isAgent,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
