import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

interface AlchemyWebhookEvent {
  webhookId: string
  id: string
  createdAt: string
  type: string
  event: {
    network: string
    activity: {
      fromAddress: string
      toAddress: string
      value: number
      asset: string
      category: string
      hash: string
      blockNum: string
    }[]
  }
}

function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body, 'utf8')
  const expectedSignature = hmac.digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-alchemy-signature')
    const rawBody = await request.text()

    const webhookSecret = process.env.ALCHEMY_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('ALCHEMY_WEBHOOK_SECRET not configured')
      return NextResponse.json(
        { error: 'Webhook not configured' },
        { status: 500 }
      )
    }

    if (!verifyWebhookSignature(signature, rawBody, webhookSecret)) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const webhook: AlchemyWebhookEvent = JSON.parse(rawBody)

    for (const activity of webhook.event.activity) {
      const payment = await prisma.cryptoPayment.findFirst({
        where: {
          address: activity.toAddress,
          status: 'PENDING',
        },
      })

      if (payment) {
        const amountInWei = BigInt(activity.value * 1e18)
        const expectedAmountInWei = BigInt(payment.amount)

        if (amountInWei >= expectedAmountInWei) {
          await prisma.cryptoPayment.update({
            where: { id: payment.id },
            data: {
              status: 'CONFIRMED',
              transactionHash: activity.hash,
              confirmedAt: new Date(),
              fromAddress: activity.fromAddress,
              blockNumber: activity.blockNum,
            },
          })

          // TODO: Shopifyの注文を更新する処理を追加
          console.log(`Payment confirmed for order ${payment.orderId}`)
        } else {
          await prisma.cryptoPayment.update({
            where: { id: payment.id },
            data: {
              status: 'INSUFFICIENT',
              transactionHash: activity.hash,
              fromAddress: activity.fromAddress,
            },
          })

          console.log(`Insufficient payment for order ${payment.orderId}`)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}