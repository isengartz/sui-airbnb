import React, { useState } from 'react';
import { useWallets, useCurrentWallet, useConnectWallet, useDisconnectWallet } from '@mysten/dapp-kit';

export const Navbar: React.FC = () => {
  const wallets = useWallets();
  const { currentWallet } = useCurrentWallet();
  const { mutate: connect } = useConnectWallet();
  const { mutate: disconnect } = useDisconnectWallet();
  
  const isConnected = !!currentWallet;
  const walletAddress = currentWallet?.accounts[0]?.address;
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnect = () => {
    setShowWalletModal(true);
  };

  const handleWalletSelect = (wallet: typeof wallets[0]) => {
    connect({ wallet });
    setShowWalletModal(false);
  };

  return (
    <nav className="bg-white shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-xl font-bold">SUI Airbnb</div>
        <div className="flex items-center">
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
            >
              Disconnect {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Select a Wallet</h2>
            <div className="space-y-2">
              {wallets.map((wallet) => (
                <button
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
