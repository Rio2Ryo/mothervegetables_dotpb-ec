import { NextRequest, NextResponse } from 'next/server'
import { generateChildWallet } from '@/lib/crypto-payment'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, totalAmount, currency, items } = body

    // 注文IDが提供されていない場合は生成
    const finalOrderId = orderId || uuidv4()

    // 子ウォレットを生成
    const childWallet = await generateChildWallet(finalOrderId)

    // レスポンス用のデータ（プライベートキーは除外）
    const responseData = {
      orderId: finalOrderId,
      walletAddress: childWallet.address,
      derivationPath: childWallet.derivationPath,
      createdAt: childWallet.createdAt,
      totalAmount,
      currency,
      items
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error generating child wallet:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate child wallet' 
      },
      { status: 500 }
    )
  }
}
