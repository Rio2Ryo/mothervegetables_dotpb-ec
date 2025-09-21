import { NextRequest, NextResponse } from 'next/server'
import { monitorPayment, PaymentStatus } from '@/lib/crypto-payment'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, expectedAmount, orderId } = body

    if (!walletAddress || !expectedAmount || !orderId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required parameters' 
        },
        { status: 400 }
      )
    }

    // 支払い状況を監視
    const paymentStatus = await monitorPayment(walletAddress, expectedAmount, orderId)

    return NextResponse.json({
      success: true,
      data: paymentStatus
    })
  } catch (error) {
    console.error('Error monitoring payment:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to monitor payment' 
      },
      { status: 500 }
    )
  }
}
