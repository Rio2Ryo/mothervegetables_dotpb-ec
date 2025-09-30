import { NextRequest, NextResponse } from 'next/server'
import { generateChildWallet } from '@/lib/crypto-payment'
import { GraphQLOrderManager } from '@/lib/shopify/graphql-order-manager'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, totalAmount, currency, items } = body

    // 注文IDが提供されていない場合は生成
    const finalOrderId = orderId || uuidv4()

    // 子ウォレットを生成
    const childWallet = await generateChildWallet(finalOrderId)

    // Shopifyドラフト注文を作成
    let draftOrderId = null
    try {
      const orderManager = new GraphQLOrderManager()
      const draftOrder = await orderManager.createDraftOrder({
        lineItems: items.map((item: {id: string, quantity: number, price: string}) => ({
          variantId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        totalPrice: totalAmount,
        customerEmail: 'crypto-payment@example.com',
        walletAddress: childWallet.address,
        orderId: finalOrderId
      })
      
      draftOrderId = draftOrder.draftOrder.id
      console.log('✅ Shopify draft order created:', draftOrderId)

      // 暗号通貨決済情報をメタフィールドとして保存
      await orderManager.addCryptoPaymentInfo(draftOrderId, {
        transactionHash: '',
        fromAddress: '',
        toAddress: childWallet.address,
        amount: totalAmount,
        currency: currency || 'SepoliaETH'
      })
      console.log('✅ Crypto payment info added to draft order')
    } catch (shopifyError) {
      console.error('⚠️ Shopify draft order creation failed:', shopifyError)
      // Shopifyのエラーがあってもウォレット生成は続行
    }

    // レスポンス用のデータ（プライベートキーは除外）
    const responseData = {
      orderId: finalOrderId,
      walletAddress: childWallet.address,
      derivationPath: childWallet.derivationPath,
      createdAt: childWallet.createdAt,
      totalAmount,
      currency,
      items,
      draftOrderId // 重要な: draftOrderIdを追加
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
