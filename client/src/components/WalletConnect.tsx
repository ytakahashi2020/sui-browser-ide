import React from 'react';
import { ConnectButton, useCurrentAccount, useCurrentWallet, useDisconnectWallet } from '@mysten/dapp-kit';
import { FiUser, FiLogOut, FiCheck } from 'react-icons/fi';
import axios from 'axios';

export const WalletConnect: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const { currentWallet } = useCurrentWallet();
  const { mutate: disconnect } = useDisconnectWallet();

  const setActiveAddress = async () => {
    if (currentAccount?.address) {
      try {
        await axios.post('/api/sui/set-active-address', {
          address: currentAccount.address
        });
        console.log('Active address set to:', currentAccount.address);
      } catch (error) {
        console.error('Failed to set active address:', error);
      }
    }
  };

  return (
    <div className="flex items-center gap-3">
      {currentAccount ? (
        <div className="flex items-center gap-2 bg-gray-700 px-3 py-1.5 rounded">
          <FiUser size={16} className="text-green-400" />
          <span className="text-sm text-gray-300">
            {currentAccount.address.slice(0, 6)}...{currentAccount.address.slice(-4)}
          </span>
          <button
            onClick={setActiveAddress}
            className="ml-2 p-1 hover:bg-gray-600 rounded text-green-400"
            title="Set as Active Address for Sui CLI"
          >
            <FiCheck size={14} />
          </button>
          <button
            onClick={() => disconnect()}
            className="ml-1 p-1 hover:bg-gray-600 rounded"
            title="Disconnect"
          >
            <FiLogOut size={14} />
          </button>
        </div>
      ) : (
        <ConnectButton className="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 rounded text-sm" />
      )}
      {currentWallet && (
        <span className="text-xs text-gray-400">
          {currentWallet.name}
        </span>
      )}
    </div>
  );
};