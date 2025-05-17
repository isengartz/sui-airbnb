import {
	useConnectWallet,
	useCurrentAccount,
	useDisconnectWallet,
	useWallets,
} from "@mysten/dapp-kit";
import type React from "react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export const Navbar: React.FC = () => {
	const wallets = useWallets();
	const currentAccount = useCurrentAccount();
	const { mutate: connect } = useConnectWallet();
	const { mutate: disconnect } = useDisconnectWallet();
	const { authState, loginWithWallet, logout } = useAuth();

	const isConnected = !!currentAccount;
	const walletAddress = currentAccount?.address;

	const [showWalletModal, setShowWalletModal] = useState(false);
	const [busy, setBusy] = useState<"connecting" | "signing" | null>(null);

	const handleWalletSelect = async (wallet: (typeof wallets)[0]) => {
		setBusy("connecting");
		setShowWalletModal(false);

		connect(
			{ wallet },
			{
				onSuccess: async ({ accounts }) => {
					if (!accounts?.length) {
						setBusy(null);
						return;
					}

					try {
						setBusy("signing");
						await loginWithWallet(accounts[0].address, accounts[0].publicKey);
					} catch (err) {
						console.error("Auth failed:", err);
						disconnect(); // roll back connection if auth fails
					} finally {
						setBusy(null);
					}
				},
				onError: (err) => {
					console.error("Wallet connect failed:", err);
					setBusy(null);
				},
			},
		);
	};

	const handleLogout = () => {
		disconnect();
		logout();
	};

	/* --------------------------------------------------------------------- */
	return (
		<nav className="bg-white shadow-lg">
			<div className="container mx-auto flex justify-between items-center py-4">
				<div className="text-xl font-bold">SUI Airbnb</div>

				<div className="flex items-center space-x-2">
					{isConnected ? (
						authState.isAuthenticated ? (
							<>
								<span className="text-sm text-gray-600">
									{authState.user?.role && `(${authState.user.role})`}
								</span>
								<span className="text-sm">
									{walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
								</span>
								<button
									type="button"
									onClick={handleLogout}
									className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
								>
									Logout
								</button>
							</>
						) : (
							<>
								<span className="text-sm">
									{walletAddress?.slice(0, 6)}…{walletAddress?.slice(-4)}
								</span>
								{busy === "signing" ? (
									<span className="text-sm italic">Signing in…</span>
								) : (
									<button
										type="button"
										onClick={() => disconnect()}
										className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 text-sm"
									>
										Disconnect
									</button>
								)}
							</>
						)
					) : (
						<button
							type="button"
							onClick={() => setShowWalletModal(true)}
							disabled={!!busy}
							className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
						>
							{busy === "connecting" ? "Connecting…" : "Connect wallet"}
						</button>
					)}
				</div>
			</div>

			{/* Wallet picker */}
			{showWalletModal && (
				<div
					className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
					aria-modal="true"
				>
					<div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
						<h2 className="text-xl font-bold mb-4">Select a wallet</h2>

						<div className="space-y-2">
							{wallets.map((w) => (
								<button
									type="button"
									key={w.name}
									onClick={() => handleWalletSelect(w)}
									className="w-full p-3 text-left border rounded-lg hover:bg-gray-50 flex items-center space-x-3 disabled:opacity-50"
									disabled={busy !== null}
								>
									{w.icon && (
										<img src={w.icon} alt={w.name} className="w-6 h-6" />
									)}
									<span>{w.name}</span>
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
