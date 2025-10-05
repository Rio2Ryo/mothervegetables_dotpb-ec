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

    // Shopifyで顧客を作成してログイン（レート制限対策のリトライ付き）
    let result;
    const retries = 5;
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        if (i > 0) {
          // レート制限エラー後は徐々に待機時間を増やす（2秒、4秒、8秒...）
          const waitTime = Math.min(2000 * Math.pow(2, i - 1), 10000);
          console.log(`Register retry ${i}/${retries - 1}, waiting ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        result = await createCustomerAndLogin({
          firstName,
          lastName,
          email,
          password,
          phone: phone || undefined,
          acceptsMarketing: acceptsMarketing || false,
        });

        // 成功したらループを抜ける
        if (!result.errors || (result.customer && result.customerAccessToken)) {
          console.log('Customer creation successful after', i + 1, 'attempts');
          break;
        }

        lastError = result;
        console.log(`Register attempt ${i + 1} failed:`, result.errors);
      } catch (error: unknown) {
        lastError = error;
        console.log(`Register attempt ${i + 1} error:`, error);

        // THROTTLEDエラー以外は即座に失敗
        if (error instanceof Error &&
            !error.message.includes('THROTTLED') &&
            !error.message.includes('上限に達しました')) {
          throw error;
        }
      }
    }

    console.log('Customer creation result:', JSON.stringify(result, null, 2));

    if (!result || result.errors || !result.customer || !result.customerAccessToken) {
      console.error('Customer creation failed:', result?.errors);

      // エラーコードに基づいてメッセージをカスタマイズ
      let errorMessage = '新規登録に失敗しました';
      if (result?.errors?.[0]) {
        const errorCode = result?.errors[0].code;
        const field = result?.errors[0].field;

        if (errorCode === 'TAKEN' || (field && field.includes('email'))) {
          errorMessage = 'このメールアドレスは既に登録されています';
        } else if (errorCode === 'CUSTOMER_DISABLED') {
          errorMessage = 'このアカウントは無効化されています';
        } else if (errorCode === 'INVALID' && field?.includes('phone')) {
          errorMessage = '電話番号の形式が正しくありません';
        } else if (errorCode === 'INVALID' && field?.includes('email')) {
          errorMessage = 'メールアドレスの形式が正しくありません';
        } else {
          errorMessage = result?.errors[0].message || errorMessage;
        }
      }

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
          errors: result?.errors,
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
