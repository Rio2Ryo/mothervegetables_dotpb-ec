import { NextRequest, NextResponse } from 'next/server'
import { GraphQLOrderManager } from '@/lib/shopify/graphql-order-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Crypto Payment Confirmation API Called ===')
    const body = await request.json()
    console.log('Request body:', body)

    const { draftOrderId, transactionHash, fromAddress, toAddress, amount, currency, agentCode } = body

    if (!draftOrderId || !transactionHash || !fromAddress || !toAddress || !amount) {
      console.error('Missing required parameters:', { 
        draftOrderId: !!draftOrderId, 
        transactionHash: !!transactionHash, 
        fromAddress: !!fromAddress, 
        toAddress: !!toAddress, 
        amount: !!amount 
      })
      return NextResponse.json(
        { error: 'Draft order ID, transaction hash, addresses, and amount are required' },
        { status: 400 }
      )
    }

    console.log('Completing draft order:', draftOrderId)
    const orderManager = new GraphQLOrderManager()
    
    // ドラフト注文を完成させる
    const completedOrder = await orderManager.completeDraftOrder(draftOrderId)
    console.log('Draft order completed:', completedOrder.draftOrder.order.id)

    // 暗号通貨決済情報をメタフィールドとして保存
    console.log('Adding crypto payment info to completed order...')
    await orderManager.addCryptoPaymentInfo(completedOrder.draftOrder.order.id, {
      transactionHash,
      fromAddress,
      toAddress,
      amount: amount.toString(),
      currency: currency || 'ETH'
    })
    console.log('Crypto payment info added successfully')

    // 包括的なメタデータを保存
    console.log('Adding comprehensive metadata to completed order...')
    
    // 顧客情報を生成（実際の実装ではデータベースから取得）
    const customerInfo = {
      isNewCustomer: true,
      totalOrders: 0,
      customerSegment: 'new' as const,
      preferredLanguage: 'ja-JP',
      timezone: 'Asia/Tokyo',
      deviceType: 'desktop' as const,
      browser: 'Chrome',
      referrer: 'direct',
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
    }
    
    // 価格保証情報（実際の実装ではPriceGuaranteeContextから取得）
    const priceGuarantee = {
      isActive: false,
      guaranteedPrice: 0,
      originalPrice: 0,
      savings: 0,
      expiresAt: new Date().toISOString(),
      guaranteeType: 'time' as const,
      guaranteeId: `guarantee_${Date.now()}`,
    }
    
    // 決済詳細情報
    const paymentDetails = {
      method: 'crypto' as const,
      processor: 'Ethereum',
      fee: 0,
      exchangeRate: undefined,
      gasFee: undefined,
      confirmationTime: Date.now(),
      transactionId: transactionHash,
      gateway: 'Ethereum',
    }
    
    // セッション情報
    const sessionInfo = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
    }
    
    // TODO: メタデータ追加機能を実装
    console.log('Metadata to be added:', {
      agentCode,
      customerInfo,
      priceGuarantee,
      paymentDetails,
      sessionInfo,
    })

    // const metadataResult = await orderManager.addComprehensiveOrderMetadata(completedOrder.draftOrder.order.id, {
    //   agentCode,
    //   customerInfo,
    //   priceGuarantee,
    //   paymentDetails,
    //   sessionInfo,
    // })

    // console.log('Comprehensive metadata added successfully:', metadataResult)

    const responseData = {
      success: true,
      data: {
        orderId: completedOrder.draftOrder.order.id,
        orderName: completedOrder.draftOrder.order.name,
        status: 'completed',
        transactionHash,
        fromAddress,
        toAddress,
        amount,
        currency: currency || 'ETH'
      }
    }

    console.log('Returning response:', responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Payment confirmation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        error: 'Failed to confirm payment',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

