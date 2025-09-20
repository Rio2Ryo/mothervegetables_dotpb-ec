import { NextRequest, NextResponse } from 'next/server';
import { createCheckoutWithAgentMetadata } from '@/lib/shopify/checkout-metadata';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { lineItems, agentCode, discountCode, countryCode, currencyCode } = body;

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'カートアイテムが必要です',
        },
        { status: 400 }
      );
    }

    // Cookieからユーザーのアクセストークンを取得
    const customerAccessToken = request.cookies.get('customerAccessToken')?.value;

    console.log('Creating checkout with agent metadata:', {
      lineItemsCount: lineItems.length,
      agentCode,
      discountCode,
      countryCode,
      currencyCode,
      hasCustomerToken: !!customerAccessToken
    });

    // 代理店情報、クーポンコード、ユーザー情報、国コード、通貨コードを含めてチェックアウトを作成
    const result = await createCheckoutWithAgentMetadata(lineItems, agentCode, discountCode, customerAccessToken, countryCode, currencyCode);

    if (!result.success || !result.checkout) {
      return NextResponse.json(
        {
          success: false,
          message: 'チェックアウトの作成に失敗しました',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      checkout: result.checkout,
      message: 'チェックアウトが作成されました',
    });

  } catch (error) {
    console.error('Checkout creation error:', error);
    const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

