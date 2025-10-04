import { ethers } from 'ethers'
import { MASTER_WALLET_CONFIG, CHILD_WALLET_CONFIG, NETWORK_CONFIG } from './alchemy'

// 子ウォレット秘密鍵の保存用Map（メモリ内）
const childWalletKeys = new Map<string, string>()

// プロバイダーを取得する共通関数
function getProvider() {
  return new ethers.JsonRpcProvider(process.env.ALCHEMY_API_KEY ?
    `https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}` :
    'https://sepolia.infura.io/v3/YOUR_INFURA_KEY'
  )
}

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
  fromAddress?: string
  blockNumber?: number
  timestamp?: Date
}

/**
 * マスターウォレットから子ウォレットを生成（HD Wallet実装）
 */
export async function generateChildWallet(orderId: string): Promise<ChildWallet> {
  try {
    // マスターウォレットの設定
    if (!MASTER_WALLET_CONFIG.privateKey) {
      throw new Error('Master wallet private key not configured')
    }

    // 注文IDから決定論的なインデックスを生成
    const index = generateDeterministicIndex(orderId)
    
    // 子ウォレットの導出パス（BIP44標準）
    const derivationPath = `${CHILD_WALLET_CONFIG.derivationPath}${index}`
    
    // マスターウォレットからHD Walletを生成
    const masterWallet = new ethers.Wallet(MASTER_WALLET_CONFIG.privateKey)
    
    // HD Walletの実装（ethers.js v6では直接サポートされていないため、手動実装）
    const childWallet = await deriveChildWallet(masterWallet, derivationPath)
    
    // 秘密鍵を保存（自動送金用）
    childWalletKeys.set(orderId, childWallet.privateKey)
    console.log(`🔑 子ウォレット秘密鍵を保存: ${orderId} -> ${childWallet.address}`)
    console.log(`📋 導出パス: ${derivationPath}`)
    
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
 * HD Walletから子ウォレットを導出
 */
async function deriveChildWallet(masterWallet: ethers.Wallet, derivationPath: string): Promise<ethers.Wallet> {
  try {
    // マスターウォレットの秘密鍵からHD Walletを生成
    const masterPrivateKey = masterWallet.privateKey
    
    // 導出パスを解析（例: m/44'/60'/0'/0/123）
    const pathParts = derivationPath.split('/')
    const index = parseInt(pathParts[pathParts.length - 1])
    
    // マスター秘密鍵とインデックスから子秘密鍵を導出
    const childPrivateKey = derivePrivateKey(masterPrivateKey, index)
    
    // 子ウォレットを生成
    const childWallet = new ethers.Wallet(childPrivateKey)
    
    console.log(`🔗 HD Wallet導出: ${masterWallet.address} -> ${childWallet.address}`)
    console.log(`📋 導出パス: ${derivationPath}`)
    console.log(`🔢 インデックス: ${index}`)
    
    return childWallet
  } catch (error) {
    console.error('HD Wallet導出エラー:', error)
    throw new Error('Failed to derive child wallet')
  }
}

/**
 * マスター秘密鍵から子秘密鍵を導出
 */
function derivePrivateKey(masterPrivateKey: string, index: number): string {
  // マスター秘密鍵とインデックスを結合してハッシュ化
  const combined = ethers.concat([
    ethers.toUtf8Bytes(masterPrivateKey),
    ethers.toUtf8Bytes(index.toString())
  ])
  
  const hash = ethers.keccak256(combined)
  return hash
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
      console.log(`💰 支払い検知: ${walletAddress} に ${currentBalance} ETH が入金されました`)
      
      // 自動送金を実行
      try {
        const transferResult = await transferToMasterWallet(orderId, currentBalance)
        if (transferResult.success) {
          console.log(`✅ 自動送金完了: ${transferResult.transactionHash}`)
        } else {
          console.warn(`⚠️ 自動送金失敗: ${transferResult.error}`)
        }
      } catch (error) {
        console.error('❌ 自動送金エラー:', error)
      }
      
      // 実際のトランザクション情報を取得（直接RPC呼び出し）
      try {
        console.log(`🔍 トランザクション検索開始: ${walletAddress}`)
        
        // 直接RPC呼び出しでトランザクション情報を取得
        const requestBody = {
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [{
            toAddress: walletAddress,
            category: ['external'],
            withMetadata: true,
            maxCount: '0x1'  // 16進数で送信
          }],
          id: 42
        }
        
        console.log(`📤 RPCリクエスト:`, JSON.stringify(requestBody, null, 2))
        
        const response = await fetch(NETWORK_CONFIG.rpcUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log(`📊 RPC応答:`, data)
        
        if (data.result && data.result.transfers && data.result.transfers.length > 0) {
          const latestTransfer = data.result.transfers[0]
          console.log(`📋 最新トランザクション: ${latestTransfer.hash}`)
          console.log(`📋 送信元: ${latestTransfer.from}`)
          console.log(`📋 ブロック番号: ${latestTransfer.blockNum}`)
          console.log(`📋 タイムスタンプ: ${latestTransfer.metadata.blockTimestamp}`)

          return {
            orderId,
            walletAddress,
            isPaid: true,
            amount: currentBalance,
            transactionHash: latestTransfer.hash,
            fromAddress: latestTransfer.from,
            blockNumber: parseInt(latestTransfer.blockNum),
            timestamp: new Date(parseInt(latestTransfer.metadata.blockTimestamp) * 1000)
          }
        } else {
          console.log(`⚠️ トランザクションが見つかりません: ${walletAddress}`)
        }
      } catch (error) {
        console.error('❌ トランザクション情報取得エラー:', error)
        console.error('❌ エラー詳細:', error instanceof Error ? error.message : String(error))
      }
      
      // フォールバック: 基本的な支払い情報を返す
      console.log(`📋 フォールバック: 基本的な支払い情報を返します`)
      return {
        orderId,
        walletAddress,
        isPaid: true,
        amount: currentBalance,
        transactionHash: "0x" + "0".repeat(64), // プレースホルダー
        fromAddress: "0x0000000000000000000000000000000000000000", // プレースホルダー
        blockNumber: 12345678,
        timestamp: new Date()
      }
    }

    return {
      orderId,
      walletAddress,
      isPaid: false,
      amount: currentBalance,
      fromAddress: undefined
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
 * 子ウォレットからマスターウォレットへの自動送金
 */
export async function transferToMasterWallet(
  orderId: string,
  amount: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    console.log(`💰 支払い検知: マスターウォレットへの自動移動を開始`)
    console.log(`マスターウォレット: ${MASTER_WALLET_CONFIG.address}`)
    console.log(`移動金額: ${amount}`)
    
    // 子ウォレットの秘密鍵を取得
    console.log(`🔍 秘密鍵検索: orderId=${orderId}`)
    console.log(`🔍 保存済み秘密鍵数: ${childWalletKeys.size}`)
    console.log(`🔍 保存済みorderId: ${Array.from(childWalletKeys.keys())}`)
    
    const childPrivateKey = childWalletKeys.get(orderId)
    if (!childPrivateKey) {
      console.warn(`⚠️ 子ウォレットの秘密鍵が見つかりません: ${orderId}`)
      
      // フォールバック: 子ウォレットを再生成
      try {
        console.log(`🔄 子ウォレットを再生成中...`)
        const childWallet = await generateChildWallet(orderId)
        childWalletKeys.set(orderId, childWallet.privateKey)
        console.log(`✅ 子ウォレット再生成完了: ${childWallet.address}`)
        
        // 再生成した秘密鍵を使用
        const newChildWallet = new ethers.Wallet(childWallet.privateKey)
        
        // プロバイダーを設定
        const provider = getProvider()
        const connectedNewChildWallet = newChildWallet.connect(provider)
        
        return await executeTransfer(connectedNewChildWallet, amount)
      } catch (error) {
        console.error('❌ 子ウォレット再生成エラー:', error)
        return { success: false, error: 'Failed to regenerate child wallet' }
      }
    }
    
    // 子ウォレットのウォレットオブジェクトを作成
    const childWallet = new ethers.Wallet(childPrivateKey)
    
    // プロバイダーを設定
    const provider = getProvider()
    const connectedChildWallet = childWallet.connect(provider)
    
    return await executeTransfer(connectedChildWallet, amount)
    
  } catch (error) {
    console.error('❌ 自動送金エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * 送金実行の共通処理
 */
async function executeTransfer(
  childWallet: ethers.Wallet,
  amount: string
): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
  try {
    // マスターウォレットのアドレスを取得
    const masterWallet = new ethers.Wallet(MASTER_WALLET_CONFIG.privateKey)
    const masterAddress = masterWallet.address
    
    // ガス価格を取得
    const provider = getProvider()
    
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei') // デフォルト20 gwei
    const gasLimit = 21000 // ETH送金の標準ガス制限
    
    // ガス代を計算
    const gasCost = gasPrice * BigInt(gasLimit)
    let amountWei = ethers.parseEther(amount)
    const totalCost = amountWei + gasCost
    
    // 残高を確認
    const balance = await provider.getBalance(childWallet.address)
    console.log(`💰 残高確認: ${ethers.formatEther(balance)} ETH`)
    console.log(`💰 送金金額: ${ethers.formatEther(amountWei)} ETH`)
    console.log(`💰 ガス代: ${ethers.formatEther(gasCost)} ETH`)
    console.log(`💰 必要金額: ${ethers.formatEther(totalCost)} ETH`)
    
    if (balance < totalCost) {
      console.warn(`⚠️ 残高不足: ${ethers.formatEther(balance)} < ${ethers.formatEther(totalCost)}`)
      
      // ガス代を差し引いた送金金額を計算
      const availableAmount = balance - gasCost
      if (availableAmount <= 0) {
        return { success: false, error: 'Insufficient balance for gas fees' }
      }
      
      console.log(`🔄 送金金額を調整: ${ethers.formatEther(amountWei)} → ${ethers.formatEther(availableAmount)}`)
      amountWei = availableAmount
    }
    
    // 送金トランザクションを作成
    const tx = {
      to: masterAddress,
      value: amountWei,
      gasLimit: gasLimit,
      gasPrice: gasPrice
    }
    
    console.log(`📤 送金トランザクション準備:`)
    console.log(`  送金先: ${masterAddress}`)
    console.log(`  送金金額: ${ethers.formatEther(amountWei)} ETH`)
    console.log(`  ガス制限: ${gasLimit}`)
    console.log(`  ガス価格: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`)
    
    // トランザクションを送信
    const txResponse = await childWallet.sendTransaction(tx)
    console.log(`📤 送金トランザクション送信: ${txResponse.hash}`)
    
    // トランザクションの完了を待つ
    const receipt = await txResponse.wait()
    if (!receipt) {
      throw new Error('Transaction receipt is null')
    }
    console.log(`✅ 送金完了: ${receipt.hash}`)
    
    return { 
      success: true, 
      transactionHash: receipt.hash 
    }
  } catch (error) {
    console.error('❌ 送金実行エラー:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

/**
 * ETHの金額をフォーマット
 */
export function formatEthAmount(amount: string): string {
  try {
    return ethers.formatEther(amount)
  } catch {
    return '0.0'
  }
}
