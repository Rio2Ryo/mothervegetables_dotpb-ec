export class GraphQLOrderManager {
  private adminToken: string
  private storeDomain: string

  constructor() {
    this.adminToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || 'test_token'
    this.storeDomain = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || 'test-store.myshopify.com'
    
    if (!process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || !process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN) {
      console.warn('Shopify credentials not configured, using test values')
    }
  }

  private extractNumericId(gid: string): string {
    // gid://shopify/ProductVariant/46706292982018 -> 46706292982018
    const match = gid.match(/\/(\d+)$/)
    return match ? match[1] : '0'
  }

  async createDraftOrder(orderData: {
    lineItems: Array<{variantId: string, quantity: number, price?: string}>
    totalPrice: string
    customerEmail?: string
    shippingAddress?: Record<string, unknown>
    billingAddress?: Record<string, unknown>
    walletAddress?: string
    orderId?: string
    agentCode?: string
  }) {
    const lineItems = orderData.lineItems.map(item => ({
      variantId: `gid://shopify/ProductVariant/${this.extractNumericId(item.variantId)}`,
      quantity: item.quantity,
      originalUnitPrice: item.price || '0.001' // 価格を設定
    }))

    const mutation = `
      mutation draftOrderCreate($input: DraftOrderInput!) {
        draftOrderCreate(input: $input) {
          draftOrder {
            id
            name
            tags
            totalPrice
            status
            lineItems(first: 10) {
              edges {
                node {
                  id
                  title
                  quantity
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    // 包括的なメタデータをattributesとして追加
    const attributes = [];
    
    // 代理店情報
    if (orderData.agentCode) {
      attributes.push({
        key: 'agent_code',
        value: orderData.agentCode
      });
      attributes.push({
        key: 'agent_source',
        value: `agent_landing_page_${orderData.agentCode}`
      });
    }
    
    // 顧客情報
    attributes.push({
      key: 'customer_segment',
      value: 'new'
    });
    attributes.push({
      key: 'preferred_language',
      value: 'ja-JP'
    });
    attributes.push({
      key: 'timezone',
      value: 'Asia/Tokyo'
    });
    attributes.push({
      key: 'device_type',
      value: 'desktop'
    });
    attributes.push({
      key: 'browser',
      value: 'Chrome'
    });
    attributes.push({
      key: 'referrer',
      value: 'direct'
    });
    
    // 決済情報
    attributes.push({
      key: 'payment_method',
      value: 'crypto'
    });
    attributes.push({
      key: 'payment_processor',
      value: 'Ethereum'
    });
    attributes.push({
      key: 'payment_gateway',
      value: 'Ethereum'
    });
    attributes.push({
      key: 'wallet_address',
      value: orderData.walletAddress || 'unknown'
    });
    
    // セッション情報
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    attributes.push({
      key: 'session_id',
      value: sessionId
    });
    attributes.push({
      key: 'checkout_timestamp',
      value: new Date().toISOString()
    });
    
    // 価格保証情報
    attributes.push({
      key: 'price_guarantee_active',
      value: 'false'
    });
    attributes.push({
      key: 'price_guarantee_type',
      value: 'time'
    });
    
    // マーケティング情報
    attributes.push({
      key: 'utm_source',
      value: 'direct'
    });
    attributes.push({
      key: 'utm_medium',
      value: 'none'
    });
    attributes.push({
      key: 'utm_campaign',
      value: 'none'
    });
    
    // 配送情報
    attributes.push({
      key: 'shipping_company',
      value: 'Mother Vegetables Logistics'
    });
    attributes.push({
      key: 'shipping_method',
      value: 'standard'
    });
    attributes.push({
      key: 'shipping_region',
      value: 'Japan'
    });

    const variables: {
      input: {
        lineItems: Array<{variantId: string, quantity: number, originalUnitPrice: string}>
        tags: string
        email: string
        customAttributes: Array<{key: string, value: string}>
        shippingAddress?: {
          firstName?: string
          lastName?: string
          address1?: string
          address2?: string
          city?: string
          province?: string
          zip?: string
          country?: string
          phone?: string
        }
      }
    } = {
      input: {
        lineItems: lineItems,
        tags: `crypto-payment,wallet-${orderData.walletAddress || 'unknown'},order-${orderData.orderId || 'unknown'}`,
        email: orderData.customerEmail || 'crypto-payment@example.com',
        customAttributes: attributes
      }
    }

    // 配送先住所が提供されている場合は追加
    if (orderData.shippingAddress) {
      variables.input.shippingAddress = {
        firstName: orderData.shippingAddress.firstName as string,
        lastName: orderData.shippingAddress.lastName as string,
        address1: orderData.shippingAddress.address1 as string,
        address2: orderData.shippingAddress.address2 as string,
        city: orderData.shippingAddress.city as string,
        province: orderData.shippingAddress.province as string,
        zip: orderData.shippingAddress.zip as string,
        country: orderData.shippingAddress.country as string,
        phone: orderData.shippingAddress.phone as string
      }
    }

    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify GraphQL API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    if (result.data.draftOrderCreate.userErrors.length > 0) {
      throw new Error(`Draft order creation errors: ${JSON.stringify(result.data.draftOrderCreate.userErrors)}`)
    }

    return result.data.draftOrderCreate
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
      const mutation = `
        mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            metafields {
              id
              namespace
              key
              value
            }
            userErrors {
              field
              message
            }
          }
        }
      `

      const variables = {
        metafields: [{
          ownerId: orderId,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
          type: metafield.type
        }]
      }

      await fetch(
        `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': this.adminToken
          },
          body: JSON.stringify({
            query: mutation,
            variables: variables
          })
        }
      )
    }
  }

  async completeDraftOrder(draftOrderId: string) {
    const mutation = `
      mutation draftOrderComplete($id: ID!, $paymentPending: Boolean) {
        draftOrderComplete(id: $id, paymentPending: $paymentPending) {
          draftOrder {
            id
            status
            order {
              id
              name
              email
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      id: draftOrderId,
      paymentPending: false // 暗号通貨決済は即座に支払い済みとして扱う
    }

    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify GraphQL API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    if (result.data.draftOrderComplete.userErrors.length > 0) {
      throw new Error(`Draft order completion errors: ${JSON.stringify(result.data.draftOrderComplete.userErrors)}`)
    }

    return result.data.draftOrderComplete
  }

  async updateOrderStatus(orderId: string, status: 'PAID' | 'PENDING' | 'CANCELLED') {
    const mutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order {
            id
            financialStatus
          }
          userErrors {
            field
            message
          }
        }
      }
    `

    const variables = {
      input: {
        id: orderId,
        financialStatus: status
      }
    }

    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables
        })
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Shopify GraphQL API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    if (result.data.orderUpdate.userErrors.length > 0) {
      throw new Error(`Order update errors: ${JSON.stringify(result.data.orderUpdate.userErrors)}`)
    }

    return result.data.orderUpdate
  }

  async getOrder(orderId: string) {
    const query = `
      query getOrder($id: ID!) {
        order(id: $id) {
          id
          name
          tags
          totalPrice
          financialStatus
          lineItems(first: 10) {
            edges {
              node {
                id
                title
                quantity
              }
            }
          }
        }
      }
    `

    const variables = { id: orderId }

    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch order: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    return result.data.order
  }

  async findOrdersByCryptoAddress(cryptoAddress: string) {
    const query = `
      query getOrders($query: String!) {
        orders(first: 250, query: $query) {
          edges {
            node {
              id
              name
              tags
              totalPrice
              financialStatus
            }
          }
        }
      }
    `

    const variables = { 
      query: `tag:crypto-payment AND tag:wallet-${cryptoAddress}` 
    }

    const response = await fetch(
      `https://${this.storeDomain}/admin/api/2024-01/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.adminToken
        },
        body: JSON.stringify({
          query: query,
          variables: variables
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch orders: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
    }

    return result.data.orders.edges.map((edge: {node: unknown}) => edge.node)
  }
}
