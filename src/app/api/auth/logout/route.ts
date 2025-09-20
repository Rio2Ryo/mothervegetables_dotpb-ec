import { NextRequest, NextResponse } from 'next/server';
import { deleteCustomerAccessToken } from '@/lib/shopify/storefront-client';

export async function POST(request: NextRequest) {
  try {
    const customerAccessToken = request.cookies.get('customerAccessToken')?.value;

    if (customerAccessToken) {
      // Shopifyからアクセストークンを削除
      await deleteCustomerAccessToken(customerAccessToken);
    }

    // Cookieを削除
    const response = NextResponse.json({
      success: true,
      message: 'ログアウトしました',
    });

    response.cookies.set('customerAccessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Logout API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'ログアウトに失敗しました',
      },
      { status: 500 }
    );
  }
}
