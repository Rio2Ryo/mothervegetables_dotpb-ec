import { Alchemy, Network, AssetTransfersCategory } from 'alchemy-sdk'
import { ethers } from 'ethers'

export class AlchemyService {
  private alchemy: Alchemy
  private network: Network

  constructor(apiKey: string, network: Network = Network.ETH_MAINNET) {
    this.network = network
    this.alchemy = new Alchemy({
      apiKey,
      network
    })
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.alchemy.core.getBalance(address)
    return ethers.formatEther(balance.toString())
  }

  async getTransactions(address: string): Promise<unknown> {
    return await this.alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: [AssetTransfersCategory.EXTERNAL, AssetTransfersCategory.INTERNAL]
    })
  }

  async setupWebhook(webhookUrl: string, addresses: string[]): Promise<void> {
    // TODO: Webhook setup implementation
    console.log('Webhook setup:', { webhookUrl, addresses })
    // await this.alchemy.notify.createAddressActivity Webhook({
    //   url: webhookUrl,
    //   addresses: addresses
    // })
  }
}

