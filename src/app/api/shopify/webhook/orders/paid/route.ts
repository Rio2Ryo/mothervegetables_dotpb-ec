import { NextRequest, NextResponse } from 'next/server'
import { saveAgentMetadataToOrder } from '@/lib/shopify/checkout-metadata'

export async function POST(request: NextRequest) {
  try {
    console.log('=== Shopify Order Paid Webhook Called ===')
    
    const body = await request.json()
    console.log('Webhook body:', JSON.stringify(body, null, 2))

    const order = body
    const orderId = order.id
    const orderName = order.name

    console.log('Processing order:', { orderId, orderName })

    // 注文の属性から代理店コードを取得
    const agentCode = order.attributes?.find((attr: {key: string, value: string}) =>
      attr.key === 'agent_code'
    )?.value

    console.log('Extracted agent code:', agentCode)

    if (agentCode) {
      // メタデータを保存
      const result = await saveAgentMetadataToOrder(orderId, agentCode)
      console.log('Metadata saved:', result)
    } else {
      console.log('No agent code found, skipping metadata save')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook processed successfully',
      orderId,
      agentCode 
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process webhook',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}







