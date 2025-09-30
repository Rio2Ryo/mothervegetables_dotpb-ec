/**
 * ユニークなOrderIDを生成する関数
 * 形式: MV-{timestamp}-{random}
 */
export function generateOrderId(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `MV-${timestamp}-${random}`
}

/**
 * OrderIDの形式を検証する関数
 */
export function isValidOrderId(orderId: string): boolean {
  const pattern = /^MV-\d{13}-[A-Z0-9]{6}$/
  return pattern.test(orderId)
}

/**
 * OrderIDからタイムスタンプを抽出する関数
 */
export function extractTimestampFromOrderId(orderId: string): number | null {
  const match = orderId.match(/^MV-(\d{13})-/)
  return match ? parseInt(match[1], 10) : null
}

