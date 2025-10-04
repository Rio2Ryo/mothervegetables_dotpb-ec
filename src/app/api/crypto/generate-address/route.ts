import { NextRequest, NextResponse } from 'next/server'
import { WalletManager } from '@/lib/crypto/wallet-manager'
import { GraphQLOrderManager } from '@/lib/shopify/graphql-order-manager'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Crypto Payment API Called ===')
    const body = await request.json()
    console.log('Request body:', body)

    const { orderId, amount, currency, lineItems, customerEmail, walletAddress, shippingAddress } = body

    if (!orderId || !amount || !lineItems) {
      console.error('Missing required parameters:', { orderId: !!orderId, amount: !!amount, lineItems: !!lineItems })
      return NextResponse.json(
        { 
          success: false,
          error: 'Order ID, amount, and line items are required',
          details: `Missing: orderId=${!!orderId}, amount=${!!amount}, lineItems=${!!lineItems}`
        },
        { status: 400 }
      )
    }

    console.log('Environment variables check:')
    console.log('MASTER_SEED:', process.env.MASTER_SEED ? 'SET' : 'NOT SET')
    console.log('SHOPIFY_ADMIN_ACCESS_TOKEN:', process.env.SHOPIFY_ADMIN_ACCESS_TOKEN ? 'SET' : 'NOT SET')
    console.log('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN:', process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN ? 'SET' : 'NOT SET')

    // 環境変数の検証
    if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN) {
      throw new Error('SHOPIFY_ADMIN_ACCESS_TOKEN is not configured')
    }
    if (!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) {
      throw new Error('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN is not configured')
    }

    const masterSeed = process.env.MASTER_SEED || 'vault consider bring shine that erase side oxygen mercy oven cushion radio'
    if (!process.env.MASTER_SEED) {
      console.warn('MASTER_SEED not configured, using test seed')
    }

    // 暗号通貨アドレスを生成
    console.log('🔑 Generating crypto address for order:', orderId)
    let walletManager, address, path
    try {
      walletManager = new WalletManager(masterSeed)
      const walletResult = walletManager.generateAddressForOrder(orderId)
      address = walletResult.address
      path = walletResult.path
      console.log('✅ Generated address:', address)
      console.log('📍 Derivation path:', path)
    } catch (walletError) {
      console.error('❌ Wallet generation failed:', walletError)
      throw new Error(`Wallet generation failed: ${walletError instanceof Error ? walletError.message : 'Unknown error'}`)
    }

    // Shopifyドラフト注文を作成
    console.log('Creating Shopify draft order...')
    let orderManager, draftOrder
    try {
      orderManager = new GraphQLOrderManager()
      draftOrder = await orderManager.createDraftOrder({
        lineItems,
        totalPrice: amount.toString(),
        customerEmail,
        walletAddress,
        orderId,
        shippingAddress
      })
      console.log('✅ Shopify draft order created:', draftOrder.draftOrder.id)
    } catch (shopifyError) {
      console.error('❌ Shopify draft order creation failed:', shopifyError)
      throw new Error(`Shopify draft order creation failed: ${shopifyError instanceof Error ? shopifyError.message : 'Unknown error'}`)
    }

    // 暗号通貨アドレス情報をメタフィールドとして保存
    console.log('Adding crypto payment info to Shopify draft order...')
    try {
      await orderManager.addCryptoPaymentInfo(draftOrder.draftOrder.id, {
        transactionHash: '',
        fromAddress: '',
        toAddress: address,
        amount: amount.toString(),
        currency: currency || 'ETH'
      })
      console.log('✅ Crypto payment info added successfully')
    } catch (metaError) {
      console.error('❌ Failed to add crypto payment info:', metaError)
      throw new Error(`Failed to add crypto payment info: ${metaError instanceof Error ? metaError.message : 'Unknown error'}`)
    }

    const responseData = {
      success: true,
      data: {
        address,
        amount,
        currency: currency || 'ETH',
        orderId,
        draftOrderId: draftOrder.draftOrder.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15分後に期限切れ
      }
    }
    
    console.log('Returning response:', responseData)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Address generation error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to generate payment address',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}