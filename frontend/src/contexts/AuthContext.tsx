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

// Default auth state
const defaultAuthState: AuthState = {
	token: null,
	user: null,
	isAuthenticated: false,
};

const AuthContext = createContext<{
	authState: AuthState;
	login: () => Promise<void>;
	loginWithWallet: (
		address: string,
		publicKey: WalletAccount["publicKey"],
	) => Promise<void>;
	logout: () => void;
	isAdmin: () => boolean;
	isAgent: () => boolean;
}>({
	authState: defaultAuthState,
	login: async () => {},
	loginWithWallet: async () => {},
	logout: () => {},
	isAdmin: () => false,
	isAgent: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const currentAccount = useCurrentAccount();
	const { mutate: signPersonalMessage } = useSignPersonalMessage();
	const [authState, setAuthState] = useState<AuthState>({
		token: null,
		user: authService.getUser(),
		isAuthenticated: authService.isAuthenticated(),
	});

	// Update auth state when service changes
	const updateAuthState = useCallback(() => {
		setAuthState({
			token: { token: authService.getToken() || "", expiresAt: 0 },
			user: authService.getUser(),
			isAuthenticated: authService.isAuthenticated(),
		});
	}, []);

	// Refresh token if needed
	const refreshTokenIfNeeded = useCallback(async () => {
		if (authService.needsRefresh()) {
			const refreshed = await authService.refreshIfNeeded();
			if (refreshed) {
				updateAuthState();
			}
		}
	}, [updateAuthState]);

	// Check authentication status and refresh token when needed
	useEffect(() => {
		// If user is authenticated, periodically check if token needs refresh
		if (authService.isAuthenticated()) {
			refreshTokenIfNeeded();

			// Set up interval to check for token refresh (every 5 minutes)
			const intervalId = setInterval(refreshTokenIfNeeded, 5 * 60 * 1000);

			return () => clearInterval(intervalId);
		}
	}, [refreshTokenIfNeeded]);

	// If wallet changes and we're authenticated, refresh auth state
	useEffect(() => {
		if (currentAccount && authService.isAuthenticated()) {
			updateAuthState();
		}
	}, [currentAccount, updateAuthState]);

	// Regular login for already connected wallets
	const login = async () => {
		if (!currentAccount) {
			throw new Error("No wallet connected");
		}

		try {
			console.log("Starting login process for:", currentAccount.address);
			return await loginWithWallet(
				currentAccount.address,
				currentAccount.publicKey,
			);
		} catch (error) {
			console.error("Login failed:", error);
			throw error;
		}
	};

	// Login with a specific wallet address
	const loginWithWallet = async (
		address: string,
		publicKey: WalletAccount["publicKey"],
	) => {
		try {
			console.log("Getting nonce for:", address);
			const nonce = await authService.getNonce(address);
			console.log("Received nonce:", nonce);

			const message = authService.constructChallengeMessage(address, nonce);
			console.log("Challenge message created:", message);
			console.log("Signing message:", message);

			signPersonalMessage(
				{
					message: new TextEncoder().encode(message),
				},
				{
					onSuccess: async (result) => {
						console.log("Message signed successfully");
						console.log("result", result);

						await authService.login(message, result.signature, publicKey);
						updateAuthState();
					},
					onError: (error) => {
						console.error("Signing failed:", error);
						throw error;
					},
				},
			);
		} catch (error) {
			console.error("Login process failed:", error);
			throw error;
		}
	};

	const logout = () => {
		authService.logout();
		updateAuthState();
	};

	const isAdmin = () => {
		return authState.user?.role === "admin";
	};

	const isAgent = () => {
		return authState.user?.role === "agent";
	};

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
