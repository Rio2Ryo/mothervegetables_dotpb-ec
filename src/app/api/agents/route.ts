import { NextRequest, NextResponse } from 'next/server';
import { getAgentByCode } from '@/lib/microcms/client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        {
          success: false,
          message: '代理店コードが必要です',
        },
        { status: 400 }
      );
    }

    // microCMSから代理店情報を取得
    const agent = await getAgentByCode(code);

    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          message: '指定された代理店コードは登録されていません',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Get agent API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'サーバーエラーが発生しました',
      },
      { status: 500 }
    );
  }
}
