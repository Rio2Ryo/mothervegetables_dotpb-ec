import { HDNodeWallet, Wallet, ethers } from 'ethers'
import crypto from 'crypto'

export class WalletManager {
  private masterSeed: string
  private basePath: string = "m/44'/60'/0'/0"

  constructor(masterSeed: string) {
    this.masterSeed = masterSeed
  }

  generateAddressForOrder(orderId: string): { address: string; privateKey: string; path: string } {
    const index = this.generateIndex(orderId)
    const path = `${this.basePath}/${index}`

    const hdNode = HDNodeWallet.fromPhrase(this.masterSeed, '', path)

    return {
      address: hdNode.address,
      privateKey: hdNode.privateKey,
      path: path
    }
  }

  private generateIndex(orderId: string): number {
    const hash = crypto.createHash('sha256').update(orderId).digest()
    return hash.readUInt32BE(0) % 1000000
  }

  static createMasterWallet(): { mnemonic: string; address: string } {
    const wallet = Wallet.createRandom()
    return {
      mnemonic: wallet.mnemonic!.phrase,
      address: wallet.address
    }
  }

  static validateAddress(address: string): boolean {
    try {
      ethers.getAddress(address)
      return true
    } catch {
      return false
    }
  }
}