import { BrowserProvider, Contract, ContractFactory, JsonRpcProvider, parseEther } from "ethers";

export const BSC_MAINNET = {
  chainId: 56,
  chainIdHex: "0x38",
  name: "BNB Chain",
  rpcUrl: "https://bsc-dataseed.binance.org/",
  symbol: "BNB",
  explorerUrl: "https://bscscan.com",
};

export async function getProvider() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }
  return new BrowserProvider(window.ethereum);
}

export async function requestAccounts() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  return accounts[0];
}

export async function getCurrentAccount() {
  if (!window.ethereum) return null;
  const accounts = await window.ethereum.request({ method: "eth_accounts" });
  return accounts[0] || null;
}

export async function switchToBSC() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BSC_MAINNET.chainIdHex }],
    });
  } catch (switchError: any) {
    if (switchError.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: BSC_MAINNET.chainIdHex,
            chainName: BSC_MAINNET.name,
            nativeCurrency: {
              name: "BNB",
              symbol: BSC_MAINNET.symbol,
              decimals: 18,
            },
            rpcUrls: [BSC_MAINNET.rpcUrl],
            blockExplorerUrls: [BSC_MAINNET.explorerUrl],
          },
        ],
      });
    } else {
      throw switchError;
    }
  }
}

export async function getChainId(): Promise<number> {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  return parseInt(chainId, 16);
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
