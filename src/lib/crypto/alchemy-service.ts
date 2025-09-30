import { Alchemy, Network } from 'alchemy-sdk'

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
    return ethers.formatEther(balance)
  }

  async getTransactions(address: string): Promise<unknown[]> {
    return await this.alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['external', 'internal']
    })
  }

  async setupWebhook(webhookUrl: string, addresses: string[]): Promise<void> {
    await this.alchemy.notify.webhook.create({
      url: webhookUrl,
      webhookType: 'ADDRESS_ACTIVITY',
      addresses: addresses
    })
  }
}

