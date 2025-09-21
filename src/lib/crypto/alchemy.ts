import { Alchemy, Network, AlchemySubscription } from 'alchemy-sdk'

export class AlchemyService {
  private alchemy: Alchemy

  constructor(apiKey: string, network: Network = Network.ETH_MAINNET) {
    const settings = {
      apiKey: apiKey,
      network: network,
    }
    this.alchemy = new Alchemy(settings)
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.alchemy.core.getBalance(address)
    return balance.toString()
  }

  async getTransactionHistory(address: string) {
    const transfers = await this.alchemy.core.getAssetTransfers({
      fromBlock: '0x0',
      toAddress: address,
      category: ['external', 'internal', 'erc20', 'erc721', 'erc1155'],
    })
    return transfers.transfers
  }

  async getLatestBlock() {
    const block = await this.alchemy.core.getBlockNumber()
    return block
  }

  async subscribeToAddress(
    address: string,
    callback: (txn: any) => void
  ): Promise<void> {
    this.alchemy.ws.on(
      {
        method: AlchemySubscription.PENDING_TRANSACTIONS,
        toAddress: address,
      },
      callback
    )
  }

  async unsubscribeFromAddress(address: string): Promise<void> {
    this.alchemy.ws.off({
      method: AlchemySubscription.PENDING_TRANSACTIONS,
      toAddress: address,
    })
  }

  async verifyTransaction(txHash: string, expectedAddress: string, expectedAmount: string) {
    const tx = await this.alchemy.core.getTransaction(txHash)

    if (!tx) {
      return { verified: false, reason: 'Transaction not found' }
    }

    const isAddressMatch = tx.to?.toLowerCase() === expectedAddress.toLowerCase()
    const isAmountMatch = tx.value.toString() === expectedAmount

    return {
      verified: isAddressMatch && isAmountMatch,
      transaction: tx,
      reason: !isAddressMatch ? 'Address mismatch' : !isAmountMatch ? 'Amount mismatch' : null
    }
  }

  async createWebhook(webhookUrl: string, addresses: string[]) {
    // この部分はAlchemy DashboardのAPI経由で設定する必要があります
    // Alchemy NotifyのWebhookはDashboardまたはNotify APIを通じて設定
    return {
      message: 'Webhook should be configured via Alchemy Dashboard',
      url: webhookUrl,
      addresses: addresses
    }
  }
}