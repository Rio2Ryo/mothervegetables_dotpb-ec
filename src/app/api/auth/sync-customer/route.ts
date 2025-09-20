import { NextRequest, NextResponse } from 'next/server'

export async function POST(_request: NextRequest) {
  // 一時的に無効化（PrivyApiのインポート問題解決後に実装）
  return NextResponse.json(
    { error: 'This endpoint is temporarily disabled' },
    { status: 503 }
  )
}