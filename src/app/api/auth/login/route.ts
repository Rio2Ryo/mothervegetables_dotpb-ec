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

    // Shopifyでアクセストークンを作成（リトライロジック付き）
    console.log('Attempting to create customer access token...');

    let tokenResult;
    const retries = 3;
    let lastError;

    for (let i = 0; i < retries; i++) {
      if (i > 0) {
        console.log(`Login retry ${i}/${retries - 1}, waiting 500ms...`);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      tokenResult = await createCustomerAccessToken({ email, password });
      console.log(`Login attempt ${i + 1} - Token result:`, JSON.stringify(tokenResult, null, 2));

      if (!tokenResult.errors && tokenResult.customerAccessToken) {
        console.log('Login successful after', i + 1, 'attempts');
        break;
      }

      lastError = tokenResult.errors;
    }

    if (tokenResult?.errors || !tokenResult?.customerAccessToken) {
      // エラーコードに基づいてメッセージをカスタマイズ
      let errorMessage = 'ログインに失敗しました';
      if (lastError?.[0]) {
        const errorCode = lastError[0].code;
        if (errorCode === 'UNIDENTIFIED_CUSTOMER') {
          errorMessage = 'メールアドレスまたはパスワードが正しくありません';
        } else {
          errorMessage = lastError[0].message || errorMessage;
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

    // エラーメッセージからTHROTTLEDエラーを検出
    let errorMessage = 'サーバーエラーが発生しました';
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes('THROTTLED') || error.message.includes('上限に達しました')) {
        errorMessage = '短時間に多数のリクエストが送信されました。しばらく待ってから再度お試しください。';
        statusCode = 429; // Too Many Requests
      } else if (error.message.includes('GraphQL errors:')) {
        // GraphQLエラーメッセージをそのまま使用
        const match = error.message.match(/GraphQL errors: (.+)/);
        if (match) {
          errorMessage = match[1];
          statusCode = 400;
        }
      }
    }

    return NextResponse.json(
      {
        success: false,
        message: errorMessage,
      },
      { status: statusCode }
    );
  }
}
