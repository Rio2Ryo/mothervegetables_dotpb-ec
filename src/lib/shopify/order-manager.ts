export class ShopifyOrderManager {
  private adminToken: string
  private storeDomain: string

  constructor() {
    this.adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || 'test_token'
    this.storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'test-store.myshopify.com'
    
    if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) {
      console.warn('Shopify credentials not configured, using test values')
    }
  }

  private extractNumericId(gid: string): number {
    // gid://shopify/ProductVariant/46706292982018 -> 46706292982018
    const match = gid.match(/\/(\d+)$/)
    return match ? parseInt(match[1], 10) : 0
  }

  async createOrder(orderData: {
    lineItems: Array<{variantId: string, quantity: number, price?: string}>
    totalPrice: string
    customerEmail?: string
    shippingAddress?: Record<string, unknown>
    billingAddress?: Record<string, unknown>
    walletAddress?: string
    orderId?: string
  }) {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-10/orders.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          order: {
            line_items: orderData.lineItems.map(item => ({
              variant_id: this.extractNumericId(item.variantId),
              quantity: item.quantity,
              name: '暗号通貨決済商品', // 必須フィールド
              title: '暗号通貨決済商品', // 必須フィールド
              price: item.price || '0.001' // 価格を設定
            })),
            total_price: orderData.totalPrice,
            financial_status: 'pending',
            tags: `crypto-payment,wallet-${orderData.walletAddress || 'unknown'},order-${orderData.orderId || 'unknown'}`,
            customer: orderData.customerEmail ? {
              email: orderData.customerEmail
            } : undefined,
            shipping_address: orderData.shippingAddress,
            billing_address: orderData.billingAddress,
            note: orderData.walletAddress ? `暗号通貨決済 - ウォレット: ${orderData.walletAddress}` : '暗号通貨決済'
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  async addCryptoPaymentInfo(orderId: string, cryptoData: {
    transactionHash: string
    fromAddress: string
    toAddress: string
    amount: string
    currency: string
  }) {
    const metafields = [
      {
        namespace: 'crypto_payment',
        key: 'transaction_hash',
        value: cryptoData.transactionHash,
        type: 'single_line_text_field'
      },
      {
        namespace: 'crypto_payment',
        key: 'from_address',
        value: cryptoData.fromAddress,
        type: 'single_line_text_field'
      },
      {
        namespace: 'crypto_payment',
        key: 'to_address',
        value: cryptoData.toAddress,
        type: 'single_line_text_field'
      },
      {
        namespace: 'crypto_payment',
        key: 'amount',
        value: cryptoData.amount,
        type: 'single_line_text_field'
      },
      {
        namespace: 'crypto_payment',
        key: 'currency',
        value: cryptoData.currency,
        type: 'single_line_text_field'
      }
    ]

    for (const metafield of metafields) {
      await fetch(
        `https://${this.storeDomain}/admin/api/2024-10/orders/${orderId}/metafields.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.adminToken
          },
          body: JSON.stringify({ metafield })
        }
      )
    }
  }

  async updateOrderStatus(orderId: string, status: 'paid' | 'pending' | 'cancelled') {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-10/orders/${orderId}.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          order: {
            id: orderId,
            financial_status: status
          }
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  async getOrder(orderId: string) {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-10/orders/${orderId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': this.adminToken
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.status}`)
    }

    return await response.json()
  }

  async getOrderMetafields(orderId: string) {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-10/orders/${orderId}/metafields.json`,
      {
        headers: {
          'X-Shopify-Access-Token': this.adminToken
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch metafields: ${response.status}`)
    }

    return await response.json()
  }

  async findOrdersByCryptoAddress(cryptoAddress: string) {
    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-10/orders.json?status=any&tags=crypto-payment&limit=250`,
      {
        headers: {
          'X-Shopify-Access-Token': this.adminToken
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }

    const data = await response.json()
    const orders = data.orders || []

    // 暗号通貨アドレスでフィルタリング
    const matchingOrders = []
    for (const order of orders) {
      try {
        const metafields = await this.getOrderMetafields(order.id)
        const toAddress = metafields.metafields?.find(
          (mf: {namespace: string, key: string, value: string}) => mf.namespace === 'crypto_payment' && mf.key === 'to_address'
        )?.value

        if (toAddress === cryptoAddress) {
          matchingOrders.push(order)
        }
      } catch (error) {
        console.error(`Error checking metafields for order ${order.id}:`, error)
      }
    }

    return matchingOrders
  }
}
