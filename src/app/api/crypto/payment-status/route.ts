import { NextRequest, NextResponse } from 'next/server'
import { ShopifyOrderManager } from '@/lib/shopify/order-manager'
import { AlchemyService } from '@/lib/crypto/alchemy-service'
import { Network } from 'alchemy-sdk'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const shopifyOrderId = searchParams.get('shopifyOrderId')

    if (!orderId && !shopifyOrderId) {
      return NextResponse.json(
        { error: 'Order ID or Shopify Order ID is required' },
        { status: 400 }
      )
    }

    const orderManager = new ShopifyOrderManager()
    
    // Shopify注文を取得
    let order
    if (shopifyOrderId) {
      order = await orderManager.getOrder(shopifyOrderId)
    } else {
      // orderIdで検索する場合は、タグで検索
      const orders = await fetch(
        `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders.json?status=any&tags=crypto-payment&limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': process.env.SHOPIFY_ADMIN_ACCESS_TOKEN!
          }
        }
      )
      const ordersData = await orders.json()
      order = ordersData.orders.find((o: {note?: string}) => o.note?.includes(orderId))
    }

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // メタフィールドを取得
    const metafields = await orderManager.getOrderMetafields(order.id)
    const cryptoData = metafields.metafields?.reduce((acc: Record<string, string>, mf: {namespace: string, key: string, value: string}) => {
      if (mf.namespace === 'crypto_payment') {
        acc[mf.key] = mf.value
      }
      return acc
    }, {} as Record<string, string>)

    if (!cryptoData?.to_address) {
      return NextResponse.json(
        { error: 'Crypto payment data not found' },
        { status: 404 }
      )
    }

    // Alchemyで残高を確認
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
    const balance = await alchemyService.getBalance(cryptoData.to_address)

    const isPaid = order.financial_status === 'paid'
    const isExpired = new Date() > new Date(Date.now() + 30 * 60 * 1000) // 30分後

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        shopifyOrderId: order.id,
        address: cryptoData.to_address,
        amount: cryptoData.amount,
        currency: cryptoData.currency,
        status: isPaid ? 'paid' : isExpired ? 'expired' : 'pending',
        balance: balance,
        transactionHash: cryptoData.transaction_hash,
        isExpired,
        createdAt: order.created_at,
        financialStatus: order.financial_status
      }
    })
  } catch (error) {
    console.error('Payment status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check payment status' },
      { status: 500 }
    )
  }
}