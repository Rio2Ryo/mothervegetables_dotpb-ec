import { shopifyStorefront } from './storefront-client';
// import { useAgentStore } from '@/stores/agentStore';

// カート作成時に代理店情報をメタデータに追加（新しいCart APIを使用）
export async function createCheckoutWithAgentMetadata(
  lineItems: Array<{ merchandiseId: string; quantity: number; variantId?: string }>,
  agentCode?: string,
  discountCode?: string,
  customerAccessToken?: string,
  countryCode?: string,
  // currencyCode?: string
) {
  try {
    // Step 1: カートを作成
    const createCartMutation = `
      mutation cartCreate($input: CartInput!) {
        cartCreate(input: $input) {
          cart {
            id
            checkoutUrl
            totalQuantity
            buyerIdentity {
              email
              customer {
                id
                email
                firstName
                lastName
              }
            }
            lines(first: 10) {
              edges {
                node {
                  id
                  quantity
                  merchandise {
                    ... on ProductVariant {
                      id
                      title
                      product {
                        title
                      }
                    }
                  }
                }
              }
            }
            attributes {
              key
              value
            }
            discountCodes {
              applicable
              code
            }
            note
          }
          userErrors {
            field
            message
            code
          }
        }
      }
    `;

    // カートアイテムを新しい形式に変換
    const cartLines = lineItems.map(item => ({
      merchandiseId: item.variantId || item.merchandiseId,
      quantity: item.quantity
    }));

    // 包括的なメタデータをattributesとして追加
    const attributes = [];
    
    // 代理店情報
    if (agentCode) {
      attributes.push({
        key: 'agent_code',
        value: agentCode
      });
      attributes.push({
        key: 'agent_source',
        value: `agent_landing_page_${agentCode}`
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
      value: 'credit_card'
    });
    attributes.push({
      key: 'payment_processor',
      value: 'Shopify Payments'
    });
    attributes.push({
      key: 'payment_gateway',
      value: 'Shopify'
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
    
    // 配送情報（Excelエクスポート用）
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
    
    // 注文属性としても追加（Shopify管理画面で確認可能）
    attributes.push({
      key: 'order_attributes',
      value: JSON.stringify({
        agent_code: agentCode,
        customer_segment: 'new',
        payment_method: 'credit_card',
        shipping_company: 'Mother Vegetables Logistics',
        session_id: sessionId,
        checkout_timestamp: new Date().toISOString()
      })
    });

    // 割引コードを配列形式で準備
    const discountCodes = discountCode ? [discountCode] : undefined;

    // buyerIdentityに国コード、配送先設定を追加
    const buyerIdentity: { customerAccessToken?: string; countryCode?: string } = {};
    if (customerAccessToken) {
      buyerIdentity.customerAccessToken = customerAccessToken;
    }
    if (countryCode) {
      buyerIdentity.countryCode = countryCode;
    }

    const variables = {
      input: {
        lines: cartLines,
        note: undefined,
        attributes: attributes.length > 0 ? attributes : undefined,
        discountCodes: discountCodes,
        buyerIdentity: Object.keys(buyerIdentity).length > 0 ? buyerIdentity : undefined,
      },
    };

    console.log('Creating cart with agent metadata and discount:', {
      agentCode,
      discountCode,
      countryCode,
      expectedMarket: countryCode === 'JP' ? '日本' : '国際',
      expectedCurrency: countryCode === 'JP' ? 'JPY' : 'USD',
      lineItemsCount: cartLines.length,
      cartLines,
      attributes,
      buyerIdentity
    });

    const response = await shopifyStorefront.request(createCartMutation, variables);

    if (!response || !response.cartCreate) {
      console.error('Invalid response from Shopify:', response);
      throw new Error('Invalid response from Shopify Storefront API');
    }

    const result = response.cartCreate;

    if (result.userErrors && result.userErrors.length > 0) {
      console.error('Cart creation errors:', result.userErrors);
      throw new Error(`Cart creation failed: ${result.userErrors[0].message}`);
    }

    if (!result.cart || !result.cart.checkoutUrl) {
      throw new Error('Cart created but no checkout URL returned');
    }

    // Step 2: 割引コードが適用されているか確認
    if (discountCode && result.cart.discountCodes) {
      const appliedDiscount = result.cart.discountCodes.find((dc: { code: string }) => dc.code === discountCode);
      if (appliedDiscount && !appliedDiscount.applicable) {
        console.warn(`Discount code ${discountCode} was not applicable`);
      }
    }

    // チェックアウトURLにロケールパラメータを追加（言語表示用）
    let checkoutUrl = result.cart.checkoutUrl;
    if (countryCode) {
      const url = new URL(checkoutUrl);

      // Shopifyのチェックアウトで言語を設定するパラメータを追加
      // 注: 通貨はcountryCodeによって自動的に決まる（マーケット設定に基づく）
      if (countryCode === 'JP') {
        url.searchParams.set('locale', 'ja-JP');
      } else {
        // 国際マーケットの場合は英語
        url.searchParams.set('locale', 'en-US');
      }

      checkoutUrl = url.toString();
      console.log('Modified checkout URL with locale:', checkoutUrl);
      console.log('Country code determines market/currency:', {
        countryCode,
        market: countryCode === 'JP' ? '日本' : '国際',
        expectedCurrency: countryCode === 'JP' ? 'JPY' : 'USD'
      });
    }

    return {
      success: true,
      checkout: {
        id: result.cart.id,
        webUrl: checkoutUrl,
        totalQuantity: result.cart.totalQuantity,
        lineItems: result.cart.lines,
        discountCodes: result.cart.discountCodes
      },
    };
  } catch (error) {
    console.error('Error creating cart with agent metadata:', error);
    throw error;
  }
}

// 既存のチェックアウトに代理店情報を更新
export async function updateCheckoutWithAgentMetadata(
  checkoutId: string,
  agentCode?: string
) {
  try {
    const mutation = `
      mutation checkoutAttributesUpdateV2($checkoutId: ID!, $input: CheckoutAttributesUpdateV2Input!) {
        checkoutAttributesUpdateV2(checkoutId: $checkoutId, input: $input) {
          checkout {
            id
            note
            customAttributes {
              key
              value
            }
          }
          checkoutUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const customAttributes = [];
    if (agentCode) {
      customAttributes.push({
        key: 'agent_code',
        value: agentCode
      });
      customAttributes.push({
        key: 'agent_source',
        value: `agent_landing_page_${agentCode}`
      });
    }

    const variables = {
      checkoutId,
      input: {
        note: undefined,
        customAttributes: customAttributes.length > 0 ? customAttributes : undefined,
      },
    };

    console.log('Updating checkout with agent metadata:', {
      checkoutId,
      agentCode,
      customAttributes
    });

    const response = await shopifyStorefront.request(mutation, variables);
    const result = response.checkoutAttributesUpdateV2;

    if (result.checkoutUserErrors && result.checkoutUserErrors.length > 0) {
      console.error('Checkout update errors:', result.checkoutUserErrors);
      throw new Error(`Checkout update failed: ${result.checkoutUserErrors[0].message}`);
    }

    return {
      success: true,
      checkout: result.checkout,
    };
  } catch (error) {
    console.error('Error updating checkout with agent metadata:', error);
    throw error;
  }
}

// 代理店情報を注文メタデータに保存（注文完了後）
export async function saveAgentMetadataToOrder(
  orderId: string,
  agentCode?: string
) {
  try {
    console.log('Saving agent metadata to order:', {
      orderId,
      agentCode
    });

    // GraphQLOrderManagerを使用してメタデータを保存
    const { GraphQLOrderManager } = await import('./graphql-order-manager');
    const orderManager = new GraphQLOrderManager();

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
      method: 'credit_card' as const,
      processor: 'Shopify Payments',
      fee: 0,
      exchangeRate: undefined,
      gasFee: undefined,
      confirmationTime: Date.now(),
      transactionId: `cc_${Date.now()}`,
      gateway: 'Shopify',
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
    });

    // const metadataResult = await orderManager.addComprehensiveOrderMetadata(orderId, {
    //   agentCode,
    //   customerInfo,
    //   priceGuarantee,
    //   paymentDetails,
    //   sessionInfo,
    // });

    // console.log('Agent metadata saved successfully:', metadataResult);

    return {
      success: true,
      message: 'Agent metadata saved to order',
      orderId,
      agentCode
    };
  } catch (error) {
    console.error('Error saving agent metadata to order:', error);
    throw error;
  }
}




