import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT;
    const accessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!endpoint || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Shopify設定が不足しています',
      }, { status: 500 });
    }

    // 顧客作成のテストクエリ
    const testMutation = `
      mutation testCustomerCreate {
        customerCreate(input: {
          firstName: "Test"
          lastName: "User"
          email: "test@example.com"
          password: "testpassword123"
        }) {
          customer {
            id
            email
            firstName
            lastName
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    console.log('Testing customer creation permissions...');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testMutation,
      }),
    });

    const data = await response.json();
    console.log('Customer creation test response:', JSON.stringify(data, null, 2));

    return NextResponse.json({
      success: true,
      message: '権限テスト完了',
      data: {
        status: response.status,
        shopifyResponse: data,
        hasErrors: !!data.errors,
        hasCustomerErrors: data.data?.customerCreate?.customerUserErrors?.length > 0,
      }
    });

  } catch (error) {
    console.error('Shopify permissions test error:', error);
    return NextResponse.json({
      success: false,
      error: '権限テスト失敗',
      details: (error as Error).message,
    }, { status: 500 });
  }
}


