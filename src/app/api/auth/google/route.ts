import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createCustomer } from '@/lib/shopify/storefront-client'

export async function POST(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          message: '認証が必要です',
        },
        { status: 401 }
      )
    }

    const { email, name } = session.user

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: 'メールアドレスが取得できませんでした',
        },
        { status: 400 }
      )
    }

    // 既存の顧客を確認（メールアドレスで検索）
    // 注意: 現在のgetCustomer関数はアクセストークンが必要なため、
    // 実際の実装では顧客検索の別の方法が必要です
    let customer = null

    if (!customer) {
      // 新しい顧客を作成
      const customerData = {
        email,
        firstName: name?.split(' ')[0] || '',
        lastName: name?.split(' ').slice(1).join(' ') || '',
        password: '', // Google認証ではパスワードは不要
        phone: '',
        acceptsMarketing: false,
      }

      const createResult = await createCustomer(customerData)
      
      if (createResult.errors || !createResult.customer) {
        return NextResponse.json(
          {
            success: false,
            message: '顧客の作成に失敗しました',
          },
          { status: 500 }
        )
      }

      customer = createResult.customer
    } else {
      // 既存の顧客が見つかった場合の処理
      // 実際の実装では、既存の顧客情報を取得する必要があります
    }

    // httpOnly Cookieでセッション情報を設定
    const response = NextResponse.json({
      success: true,
      customer,
    })

    // セッション情報をCookieに保存
    response.cookies.set('googleAuthSession', JSON.stringify({
      email: customer.email,
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: '/',
    })

    return response
  } catch (error) {
    console.error('Google auth API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    )
  }
}

