import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const endpoint = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT;
    const accessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

    if (!endpoint || !accessToken) {
      return NextResponse.json({
        success: false,
        error: 'Shopify設定が不足しています',
        details: {
          hasEndpoint: !!endpoint,
          hasAccessToken: !!accessToken,
        }
      }, { status: 500 });
    }

    // 簡単なGraphQLクエリでテスト
    const testQuery = `
      query {
        shop {
          name
          description
        }
      }
    `;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'X-Shopify-Storefront-Access-Token': accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: testQuery,
      }),
    });

    const data = await response.json();

    return NextResponse.json({
      success: true,
      message: 'Shopify接続テスト成功',
      data: {
        status: response.status,
        shopifyResponse: data,
      }
    });

  } catch (error) {
    console.error('Shopify test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Shopify接続テスト失敗',
      details: (error as Error).message,
    }, { status: 500 });
  }
}

