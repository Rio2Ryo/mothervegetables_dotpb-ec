import { NextRequest, NextResponse } from 'next/server'
import { processRetryQueue } from '@/lib/shopify/order-sync-retry'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック（本番環境では適切な認証を実装）
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.INTERNAL_API_TOKEN
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await processRetryQueue()

    return NextResponse.json({
      success: true,
      message: 'Retry queue processed'
    })

  } catch (error) {
    console.error('Retry queue processing error:', error)
    return NextResponse.json(
      { error: 'Failed to process retry queue' },
      { status: 500 }
    )
  }
}


