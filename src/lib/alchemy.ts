import { Alchemy, Network } from 'alchemy-sdk'

// Alchemy設定
const apiKey = process.env.ALCHEMY_API_KEY

// デバッグ用ログ
console.log('🔧 Alchemy API Key Debug:')
console.log('ALCHEMY_API_KEY:', process.env.ALCHEMY_API_KEY ? 'Set' : 'Not set')
console.log('Final API Key:', apiKey ? `${apiKey.slice(0, 10)}...` : 'Not set')

if (!apiKey) {
  throw new Error('ALCHEMY_API_KEY is not set')
}

// Alchemy設定（最新の方法）
const settings = {
  apiKey: apiKey,
  network: Network.ETH_SEPOLIA,
}

// Alchemyクライアントの作成
export const alchemy = new Alchemy(settings)

// ネットワーク設定
export const NETWORK_CONFIG = {
  chainId: 11155111, // Sepolia testnet
  name: 'Sepolia',
  rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`,
  blockExplorer: 'https://sepolia.etherscan.io'
}

// マスターウォレットの設定（テスト用）
export const MASTER_WALLET_CONFIG = {
  privateKey: process.env.MASTER_WALLET_PRIVATE_KEY || '',
  address: '', // 後で設定
}

// 子ウォレット生成用の設定
export const CHILD_WALLET_CONFIG = {
  derivationPath: "m/44'/60'/0'/0/", // BIP44標準
  maxChildWallets: 1000, // 最大子ウォレット数
}
