import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // セッションから代理店コードを取得
    const tenant = (session as any).tenant

    return NextResponse.json({
      success: true,
      user: session.user,
      tenant: tenant || null,
    })
  } catch (error) {
    console.error('Agent auth API error:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    )
  }
}
