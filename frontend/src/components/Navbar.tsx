import {
	useConnectWallet,
	useCurrentWallet,
	useDisconnectWallet,
	useWallets,
} from "@mysten/dapp-kit";
import type React from "react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export const Navbar: React.FC = () => {
	const wallets = useWallets();
	const { currentWallet } = useCurrentWallet();
	const { mutate: connect } = useConnectWallet();
	const { mutate: disconnect } = useDisconnectWallet();
	const { authState, loginWithWallet, logout } = useAuth();

	const isConnected = !!currentWallet;
	const walletAddress = currentWallet?.accounts[0]?.address;
	const [showWalletModal, setShowWalletModal] = useState(false);
	const [isLoggingIn, setIsLoggingIn] = useState(false);

	const handleConnect = () => {
		setShowWalletModal(true);
	};

	const handleWalletSelect = async (wallet: (typeof wallets)[0]) => {
		console.log("Connecting to wallet:", wallet.name);
		setIsLoggingIn(true);
		setShowWalletModal(false);

		// Connect to the wallet first
		connect(
			{ wallet },
			{
				onSuccess: async ({ accounts }) => {
					console.log("Wallet connected successfully with accounts:", accounts);

					if (accounts && accounts.length > 0) {
						// Immediately trigger login with the connected wallet
						try {
							console.log("accounts", accounts[0]);
							console.log(
								"Initiating authentication for:",
								accounts[0].address,
							);
							await loginWithWallet(
								accounts[0].address,
								accounts[0].publicKey,
							);
							console.log("Single-step authentication complete");
						} catch (error) {
							console.error(
								"Authentication failed after wallet connection:",
								error,
							);
						} finally {
							setIsLoggingIn(false);
						}
					} else {
						console.error("Wallet connected but no accounts available");
						setIsLoggingIn(false);
					}
				},
				onError: (error) => {
					console.error("Wallet connection failed:", error);
					setIsLoggingIn(false);
				},
			},
		);
	};

	const handleLogout = () => {
		disconnect();
		logout();
	};

	return (
		<nav className="bg-white shadow-lg">
			<div className="container mx-auto flex justify-between items-center py-4">
				<div className="text-xl font-bold">SUI Airbnb</div>
				<div className="flex items-center space-x-2">
					{isConnected ? (
						<>
							{authState.isAuthenticated ? (
								<div className="flex items-center space-x-2">
									<span className="text-sm text-gray-600">
										{authState.user?.role && `(${authState.user.role})`}
									</span>
									<span className="text-sm">
										{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
									</span>
									<button
										type="button"
										onClick={handleLogout}
										className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
									>
										Logout
									</button>
								</div>
							) : (
								<div className="flex items-center space-x-2">
									<span className="text-sm">
										{walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
									</span>
									{isLoggingIn ? (
										<span className="text-sm italic">Signing in...</span>
									) : (
										<button
											type="button"
											onClick={() => disconnect()}
											className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
										>
											Disconnect
										</button>
									)}
								</div>
							)}
						</>
					) : (
						<button
							type="button"
							onClick={handleConnect}
							disabled={isLoggingIn}
							className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
						>
							{isLoggingIn ? "Connecting..." : "Connect & Sign In"}
						</button>
					)}
				</div>
			</div>

			{/* Wallet Selection Modal */}
			{showWalletModal && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
						<h2 className="text-xl font-bold mb-4">Select a Wallet</h2>
						<div className="space-y-2">
							{wallets.map((wallet) => (
								<button
									type="button"
									key={wallet.name}
									onClick={() => handleWalletSelect(wallet)}
									className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 flex items-center space-x-3"
								>
									{wallet.icon && (
										<img
											src={wallet.icon}
											alt={wallet.name}
											className="w-6 h-6"
										/>
									)}
									<span>{wallet.name}</span>
								</button>
							))}
						</div>
						<button
							type="button"
							onClick={() => setShowWalletModal(false)}
							className="mt-4 w-full p-2 text-gray-500 hover:text-gray-700"
						>
							Cancel
						</button>
					</div>
				</div>
			)}
		</nav>
	);
};
