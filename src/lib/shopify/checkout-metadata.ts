import { shopifyStorefront } from './storefront-client';
import { useAgentStore } from '@/stores/agentStore';

// カート作成時に代理店情報をメタデータに追加（新しいCart APIを使用）
export async function createCheckoutWithAgentMetadata(
  lineItems: any[],
  agentCode?: string,
  discountCode?: string,
  customerAccessToken?: string,
  countryCode?: string,
  currencyCode?: string
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
      merchandiseId: item.variantId,
      quantity: item.quantity
    }));

    // 代理店情報をattributesとして追加
    const attributes = [];
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

    // 割引コードを配列形式で準備
    const discountCodes = discountCode ? [discountCode] : undefined;

    // buyerIdentityに国コード、配送先設定を追加
    const buyerIdentity: any = {};
    if (customerAccessToken) {
      buyerIdentity.customerAccessToken = customerAccessToken;
    }
    if (countryCode) {
      buyerIdentity.countryCode = countryCode;
    }

    const variables = {
      input: {
        lines: cartLines,
        note: agentCode ? `代理店経由: ${agentCode}` : undefined,
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
      const appliedDiscount = result.cart.discountCodes.find((dc: any) => dc.code === discountCode);
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
        note: agentCode ? `代理店経由: ${agentCode}` : undefined,
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
    // 注文のメタフィールドに代理店情報を保存
    // この機能はAdmin APIが必要なため、将来の拡張用
    console.log('Saving agent metadata to order:', {
      orderId,
      agentCode
    });

    // 現在はログ出力のみ（実際の実装にはAdmin APIが必要）
    return {
      success: true,
      message: 'Agent metadata logged for order',
      orderId,
      agentCode
    };
  } catch (error) {
    console.error('Error saving agent metadata to order:', error);
    throw error;
  }
}

