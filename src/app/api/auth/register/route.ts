import { NextRequest, NextResponse } from 'next/server';
import { createCustomerAndLogin } from '@/lib/shopify/storefront-client';
import type { RegisterFormData } from '@/lib/validations/auth';

export async function POST(request: NextRequest) {
  try {
    const body: RegisterFormData = await request.json();
    const { firstName, lastName, email, password, phone, acceptsMarketing } = body;

    console.log('Register request:', { firstName, lastName, email, phone, acceptsMarketing });

    // バリデーション
    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: '必須項目が入力されていません',
        },
        { status: 400 }
      );
    }

    console.log('Attempting to create customer in Shopify...');

    // Shopifyで顧客を作成してログイン
    const result = await createCustomerAndLogin({
      firstName,
      lastName,
      email,
      password,
      phone: phone || undefined,
      acceptsMarketing: acceptsMarketing || false,
    });

    console.log('Customer creation result:', JSON.stringify(result, null, 2));

    if (result.errors || !result.customer || !result.customerAccessToken) {
      const errorMessage = result.errors?.[0]?.message || '新規登録に失敗しました';
      console.error('Customer creation failed:', result.errors);
      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          errors: result.errors,
        },
        { status: 400 }
      );
    }

    // httpOnly Cookieでアクセストークンを設定
    const response = NextResponse.json({
      success: true,
      customer: result.customer,
    });

    response.cookies.set('customerAccessToken', result.customerAccessToken.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Register API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
