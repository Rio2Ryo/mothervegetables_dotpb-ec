import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AlchemyService } from '@/lib/crypto/alchemy'
import { Network } from 'alchemy-sdk'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const paymentId = searchParams.get('paymentId')

    if (!orderId && !paymentId) {
      return NextResponse.json(
        { error: 'Order ID or Payment ID is required' },
        { status: 400 }
      )
    }

    const payment = await prisma.cryptoPayment.findFirst({
      where: orderId ? { orderId } : paymentId ? { id: paymentId } : undefined,
    })

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      )
    }

    const alchemyApiKey = process.env.ALCHEMY_API_KEY
    if (!alchemyApiKey) {
      return NextResponse.json(
        { error: 'Alchemy not configured' },
        { status: 500 }
      )
    }

    const network = process.env.NETWORK === 'mainnet'
      ? Network.ETH_MAINNET
      : Network.ETH_SEPOLIA

    const alchemyService = new AlchemyService(alchemyApiKey, network)
    const balance = await alchemyService.getBalance(payment.address)

    const isExpired = payment.expiresAt < new Date()

    if (isExpired && payment.status === 'PENDING') {
      await prisma.cryptoPayment.update({
        where: { id: payment.id },
        data: { status: 'EXPIRED' },
      })
      payment.status = 'EXPIRED'
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: payment.orderId,
        address: payment.address,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        balance: balance,
        transactionHash: payment.transactionHash,
        expiresAt: payment.expiresAt,
        isExpired,
        createdAt: payment.createdAt,
        confirmedAt: payment.confirmedAt,
      },
    })
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}