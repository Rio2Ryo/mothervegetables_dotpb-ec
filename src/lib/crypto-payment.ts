import { ethers } from 'ethers'
import { MASTER_WALLET_CONFIG, CHILD_WALLET_CONFIG } from './alchemy'

// 注文情報の型定義
export interface OrderInfo {
  orderId: string
  totalAmount: string
  currency: string
  items: Array<{
    id: string
    name: string
    quantity: number
    price: string
  }>
}

// 子ウォレット情報の型定義
export interface ChildWallet {
  address: string
  privateKey: string
  derivationPath: string
  orderId: string
  createdAt: Date
}

// 支払い監視結果の型定義
export interface PaymentStatus {
  orderId: string
  walletAddress: string
  isPaid: boolean
  amount: string
  transactionHash?: string
  blockNumber?: number
  timestamp?: Date
}

/**
 * マスターウォレットから子ウォレットを生成
 */
export async function generateChildWallet(orderId: string): Promise<ChildWallet> {
  try {
    // マスターウォレットの設定
    if (!MASTER_WALLET_CONFIG.privateKey) {
      throw new Error('Master wallet private key not configured')
    }

    // 注文IDから決定論的なインデックスを生成
    const index = generateDeterministicIndex(orderId)
    
    // 子ウォレットの導出パス
    const derivationPath = `${CHILD_WALLET_CONFIG.derivationPath}${index}`
    
    // 注文IDとマスターウォレットの秘密鍵から決定論的に子ウォレットを生成
    const seed = ethers.keccak256(
      ethers.concat([
        ethers.toUtf8Bytes(orderId),
        ethers.toUtf8Bytes(MASTER_WALLET_CONFIG.privateKey),
        ethers.toUtf8Bytes(derivationPath)
      ])
    )
    
    // 子ウォレットの生成
    const childWallet = new ethers.Wallet(seed)

    return {
      address: childWallet.address,
      privateKey: childWallet.privateKey,
      derivationPath,
      orderId,
      createdAt: new Date()
    }
  } catch (err) {
    console.error('Error generating child wallet:', err)
    throw new Error('Failed to generate child wallet')
  }
}

/**
 * 注文IDから決定論的なインデックスを生成
 */
function generateDeterministicIndex(orderId: string): number {
  // 注文IDのハッシュから数値を生成
  const hash = ethers.keccak256(ethers.toUtf8Bytes(orderId))
  const index = parseInt(hash.slice(0, 8), 16) % CHILD_WALLET_CONFIG.maxChildWallets
  return index
}

/**
 * ウォレットの残高を確認（直接RPC呼び出し）
 */
export async function checkWalletBalance(address: string): Promise<string> {
  try {
    const apiKey = process.env.ALCHEMY_API_KEY
    if (!apiKey) {
      throw new Error('ALCHEMY_API_KEY is not set')
    }

    const rpcUrl = `https://eth-sepolia.g.alchemy.com/v2/${apiKey}`
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`)
    }

    const balanceWei = BigInt(data.result)
    return ethers.formatEther(balanceWei)
  } catch (error) {
    console.error('Error checking wallet balance:', error)
    throw new Error('Failed to check wallet balance')
  }
}

/**
 * 支払いの監視（Alchemyを使用）
 */
export async function monitorPayment(
  walletAddress: string, 
  expectedAmount: string,
  orderId: string
): Promise<PaymentStatus> {
  try {
    // 現在の残高を確認
    const currentBalance = await checkWalletBalance(walletAddress)
    const balanceInWei = ethers.parseEther(currentBalance)
    const expectedAmountInWei = ethers.parseEther(expectedAmount)

    // 残高が期待金額以上かチェック
    const isPaid = balanceInWei >= expectedAmountInWei

    if (isPaid) {
      // 基本的な支払い情報を返す（トランザクション詳細は後で実装）
      return {
        orderId,
        walletAddress,
        isPaid: true,
        amount: currentBalance,
        transactionHash: "0x" + "0".repeat(64), // プレースホルダー
        blockNumber: 12345678,
        timestamp: new Date()
      }
    }

    return {
      orderId,
      walletAddress,
      isPaid: false,
      amount: currentBalance
    }
  } catch (error) {
    console.error('Error monitoring payment:', error)
    throw new Error('Failed to monitor payment')
  }
}

/**
 * 支払い監視の定期実行
 */
export function startPaymentMonitoring(
  walletAddress: string,
  expectedAmount: string,
  orderId: string,
  onPaymentDetected: (status: PaymentStatus) => void,
  intervalMs: number = 30000 // 30秒間隔
): NodeJS.Timeout {
  const interval = setInterval(async () => {
    try {
      const status = await monitorPayment(walletAddress, expectedAmount, orderId)
      
      if (status.isPaid) {
        onPaymentDetected(status)
        clearInterval(interval)
      }
    } catch (error) {
      console.error('Payment monitoring error:', error)
    }
  }, intervalMs)

  return interval
}

/**
 * 支払い監視の停止
 */
export function stopPaymentMonitoring(interval: NodeJS.Timeout): void {
  clearInterval(interval)
}

/**
 * ウォレットアドレスの検証
 */
export function isValidAddress(address: string): boolean {
  return ethers.isAddress(address)
}

/**
 * ETHの金額をフォーマット
 */
export function formatEthAmount(amount: string): string {
  try {
    return ethers.formatEther(amount)
  } catch (error) {
    return '0.0'
  }
}
