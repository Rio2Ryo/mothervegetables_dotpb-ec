import { NextRequest, NextResponse } from 'next/server'
import { WalletManager } from '@/lib/crypto/wallet'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, amount, currency } = body

    if (!orderId || !amount) {
      return NextResponse.json(
        { error: 'Order ID and amount are required' },
        { status: 400 }
      )
    }

    const masterSeed = process.env.MASTER_SEED
    if (!masterSeed) {
      console.error('MASTER_SEED not configured')
      return NextResponse.json(
        { error: 'Payment system not configured' },
        { status: 500 }
      )
    }

    const walletManager = new WalletManager(masterSeed)
    const { address, path } = walletManager.generateAddressForOrder(orderId)

    const cryptoPayment = await prisma.cryptoPayment.create({
      data: {
        orderId,
        address,
        derivationPath: path,
        amount: amount.toString(),
        currency: currency || 'ETH',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30分後に期限切れ
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        address,
        amount,
        currency: currency || 'ETH',
        orderId,
        expiresAt: cryptoPayment.expiresAt,
        paymentId: cryptoPayment.id,
      },
    })
  } catch (error) {
    console.error('Address generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment address' },
      { status: 500 }
    )
  }
}