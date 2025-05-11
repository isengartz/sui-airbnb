import React from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Home from './Home';

const App: React.FC = () => {

  
  const { networkConfig } = createNetworkConfig({
    localnet: { url: getFullnodeUrl('localnet') },
    mainnet: { url: getFullnodeUrl('mainnet') },
  });
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
    <SuiClientProvider networks={networkConfig} defaultNetwork="localnet">
      <WalletProvider>
        <Home />
      </WalletProvider>
    </SuiClientProvider>
  </QueryClientProvider>
  );
};

export default App; 