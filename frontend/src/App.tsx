import {
	SuiClientProvider,
	WalletProvider,
	createNetworkConfig,
} from "@mysten/dapp-kit";
import { getFullnodeUrl } from "@mysten/sui/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type React from "react";
import "./App.css";
import Home from "./Home";
import { AuthProvider } from "./contexts/AuthContext";

const App: React.FC = () => {
	const { networkConfig } = createNetworkConfig({
		localnet: { url: getFullnodeUrl("localnet") },
		mainnet: { url: getFullnodeUrl("mainnet") },
	});
	const queryClient = new QueryClient();
	return (
		<QueryClientProvider client={queryClient}>
			<SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
				<WalletProvider>
					<AuthProvider>
						<Home />
					</AuthProvider>
				</WalletProvider>
			</SuiClientProvider>
		</QueryClientProvider>
	);
};

export default App;
