import { ethers } from 'ethers'

export class WalletManager {
  private masterSeed: string

  constructor(masterSeed: string) {
    this.masterSeed = masterSeed
  }

  generateAddressForOrder(orderId: string): { address: string; path: string } {
    // 注文ID + タイムスタンプから決定論的なパスを生成
    const timestamp = Date.now()
    const uniqueId = `${orderId}_${timestamp}`
    const path = `m/44'/60'/0'/0/${this.hashToNumber(uniqueId)}`
    
    console.log('🔑 Generating new wallet address:', {
      orderId,
      timestamp,
      uniqueId,
      path
    })
    
    // HDウォレットからアドレスを生成
    const wallet = ethers.HDNodeWallet.fromMnemonic(ethers.Mnemonic.fromPhrase(this.masterSeed), path)
    
    console.log('✅ Generated wallet address:', wallet.address)
    
    return {
      address: wallet.address,
      path: path
    }
  }

  private hashToNumber(input: string): number {
    // 文字列を数値に変換（決定論的）
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit整数に変換
    }
    return Math.abs(hash) % 1000000 // 0-999999の範囲
  }
}
