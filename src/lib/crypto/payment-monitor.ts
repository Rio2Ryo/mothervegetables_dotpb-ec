import { AlchemyService } from './alchemy'
import { PrismaClient } from '@prisma/client'
import { Network } from 'alchemy-sdk'

const prisma = new PrismaClient()

export class PaymentMonitor {
  private alchemyService: AlchemyService
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map()

  constructor(apiKey: string, network: Network = Network.ETH_MAINNET) {
    this.alchemyService = new AlchemyService(apiKey, network)
  }

  async startMonitoring(paymentId: string, intervalMs: number = 10000) {
    if (this.monitoringIntervals.has(paymentId)) {
      console.log(`Already monitoring payment ${paymentId}`)
      return
    }

    const interval = setInterval(async () => {
      await this.checkPayment(paymentId)
    }, intervalMs)

    this.monitoringIntervals.set(paymentId, interval)
    console.log(`Started monitoring payment ${paymentId}`)

    await this.checkPayment(paymentId)
  }

  stopMonitoring(paymentId: string) {
    const interval = this.monitoringIntervals.get(paymentId)
    if (interval) {
      clearInterval(interval)
      this.monitoringIntervals.delete(paymentId)
      console.log(`Stopped monitoring payment ${paymentId}`)
    }
  }

  private async checkPayment(paymentId: string) {
    try {
      const payment = await prisma.cryptoPayment.findUnique({
        where: { id: paymentId },
      })

      if (!payment || payment.status !== 'PENDING') {
        this.stopMonitoring(paymentId)
        return
      }

      if (payment.expiresAt < new Date()) {
        await prisma.cryptoPayment.update({
          where: { id: paymentId },
          data: { status: 'EXPIRED' },
        })
        this.stopMonitoring(paymentId)
        return
      }

      const transfers = await this.alchemyService.getTransactionHistory(payment.address)

      for (const transfer of transfers) {
        if (transfer.category === 'external' || transfer.category === 'internal') {
          const value = transfer.value || 0
          const amountInWei = BigInt(Math.floor(value * 1e18))
          const expectedAmountInWei = BigInt(payment.amount)

          if (amountInWei >= expectedAmountInWei) {
            await prisma.cryptoPayment.update({
              where: { id: paymentId },
              data: {
                status: 'CONFIRMED',
                transactionHash: transfer.hash,
                confirmedAt: new Date(),
                fromAddress: transfer.from,
                blockNumber: transfer.blockNum,
              },
            })

            this.stopMonitoring(paymentId)
            console.log(`Payment ${paymentId} confirmed via monitoring`)
            break
          }
        }
      }
    } catch (error) {
      console.error(`Error checking payment ${paymentId}:`, error)
    }
  }

  stopAllMonitoring() {
    for (const [paymentId, interval] of this.monitoringIntervals) {
      clearInterval(interval)
      console.log(`Stopped monitoring payment ${paymentId}`)
    }
    this.monitoringIntervals.clear()
  }
}