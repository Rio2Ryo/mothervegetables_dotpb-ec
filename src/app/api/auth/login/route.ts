import { NextRequest, NextResponse } from 'next/server';
import { createCustomerAccessToken, getCustomer } from '@/lib/shopify/storefront-client';
import type { LoginFormData } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginFormData = await request.json();
    const { email, password } = body;

    console.log('Login attempt for email:', email);

    // バリデーション
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: 'メールアドレスとパスワードが必要です',
        },
        { status: 400 }
      );
    }

    // Shopifyでアクセストークンを作成
    console.log('Attempting to create customer access token...');
    const tokenResult = await createCustomerAccessToken({ email, password });
    console.log('Token result:', JSON.stringify(tokenResult, null, 2));

    if (tokenResult.errors || !tokenResult.customerAccessToken) {
      // エラーコードに基づいてメッセージをカスタマイズ
      let errorMessage = 'ログインに失敗しました';
      if (tokenResult.errors?.[0]) {
        const errorCode = tokenResult.errors[0].code;
        if (errorCode === 'UNIDENTIFIED_CUSTOMER') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else {
          errorMessage = tokenResult.errors[0].message || errorMessage;
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: 401 }
      );
    }

    // 顧客情報を取得
    const customerResult = await getCustomer(tokenResult.customerAccessToken.accessToken);

    if (customerResult.errors || !customerResult.customer) {
      return NextResponse.json(
        {
          success: false,
          message: '顧客情報の取得に失敗しました',
        },
        { status: 500 }
      );
    }

    // httpOnly Cookieでアクセストークンを設定
    const response = NextResponse.json({
      success: true,
      customer: customerResult.customer,
    });

    response.cookies.set('customerAccessToken', tokenResult.customerAccessToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
