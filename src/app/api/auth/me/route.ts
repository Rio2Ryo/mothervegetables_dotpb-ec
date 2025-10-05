import { NextRequest, NextResponse } from 'next/server';
import { getCustomer } from '@/lib/shopify/storefront-client';

export async function GET(request: NextRequest) {
  try {
    // Shopifyカスタマートークン
    const customerAccessToken = request.cookies.get('customerAccessToken')?.value;

    if (!customerAccessToken) {
      return NextResponse.json(
        {
          success: false,
          message: '認証されていません',
        },
        { status: 401 }
      );
    }

    // 顧客情報を取得
    const customerResult = await getCustomer(customerAccessToken);

    if (customerResult.errors || !customerResult.customer) {
      return NextResponse.json(
        {
          success: false,
          message: '認証情報が無効です',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      customer: customerResult.customer,
    });
  } catch (error) {
    console.error('Get me API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
