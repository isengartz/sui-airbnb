import {
	useConnectWallet,
	useCurrentAccount,
	useDisconnectWallet,
	useWallets,
} from "@mysten/dapp-kit";
import { ExitIcon, PersonIcon } from "@radix-ui/react-icons";
import {
	Avatar,
	Box,
	Button,
	Dialog,
	Flex,
	Heading,
	Text,
} from "@radix-ui/themes";
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

	const formatAddress = (addr: string | undefined) => {
		if (!addr) return "";
		return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
	};

	return (
		<Box style={{ borderBottom: "1px solid var(--gray-a5)" }}>
			<Flex
				align="center"
				justify="between"
				py="4"
				px={{ initial: "4", md: "6" }}
				style={{ maxWidth: "1200px", margin: "0 auto" }}
			>
				<Heading size="6" weight="bold" color="cyan">
					SUI Airbnb
				</Heading>

				<Flex align="center" gap="3">
					{isConnected ? (
						authState.isAuthenticated ? (
							<>
								<Text size="2" color="gray">
									{authState.user?.role && `(${authState.user.role})`}
								</Text>
								<Button variant="outline" color="gray" highContrast>
									<PersonIcon />
									{formatAddress(walletAddress)}
								</Button>
								<Button onClick={handleLogout} color="red">
									<ExitIcon />
									Logout
								</Button>
							</>
						) : (
							<>
								<Button variant="outline" color="gray" disabled highContrast>
									{formatAddress(walletAddress)}
								</Button>
								{busy === "signing" ? (
									<Text size="2" color="gray">
										Signing in…
									</Text>
								) : (
									<Button
										onClick={() => disconnect()}
										color="red"
										variant="soft"
									>
										<ExitIcon /> Disconnect
									</Button>
								)}
							</>
						)
					) : (
						<Button
							onClick={() => setShowWalletModal(true)}
							disabled={!!busy}
							size="2"
							variant="solid"
							highContrast
						>
							{busy === "connecting" ? "Connecting…" : "Connect Wallet"}
						</Button>
					)}
				</Flex>
			</Flex>

			<Dialog.Root open={showWalletModal} onOpenChange={setShowWalletModal}>
				<Dialog.Content style={{ maxWidth: 450 }}>
					<Dialog.Title>Select a Wallet</Dialog.Title>
					<Dialog.Description size="2" mb="4">
						Connect to SUI Airbnb using one of the available wallets.
					</Dialog.Description>

					<Flex direction="column" gap="3">
						{wallets.map((w) => (
							<Button
								key={w.name}
								onClick={() => handleWalletSelect(w)}
								variant="surface"
								size="3"
								disabled={busy !== null}
								style={{ justifyContent: "flex-start", cursor: "pointer" }}
							>
								{w.icon && (
									<Avatar
										src={w.icon}
										fallback={w.name.charAt(0)}
										size="1"
										mr="2"
									/>
								)}
								<Text>{w.name}</Text>
							</Button>
						))}
					</Flex>

					<Flex gap="3" mt="4" justify="end">
						<Dialog.Close>
							<Button variant="soft" color="gray" style={{ cursor: "pointer" }}>
								Cancel
							</Button>
						</Dialog.Close>
					</Flex>
				</Dialog.Content>
			</Dialog.Root>
		</Box>
	);
};
