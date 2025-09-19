// 通貨変換ユーティリティ

// 簡易的な為替レート（実際のプロダクションでは外部APIを使用）
export const EXCHANGE_RATES: { [key: string]: { [key: string]: number } } = {
  JPY: { 
    USD: 0.0067,  // 1円 = 0.0067ドル（2024年1月の概算）
    EUR: 0.0062,  // 1円 = 0.0062ユーロ
    GBP: 0.0053,  // 1円 = 0.0053ポンド
  },
  USD: { 
    JPY: 149.25,  // 1ドル = 149.25円
    EUR: 0.93,    // 1ドル = 0.93ユーロ
    GBP: 0.79,    // 1ドル = 0.79ポンド
  },
  EUR: {
    JPY: 161.29,  // 1ユーロ = 161.29円
    USD: 1.08,    // 1ユーロ = 1.08ドル
    GBP: 0.85,    // 1ユーロ = 0.85ポンド
  },
  GBP: {
    JPY: 188.68,  // 1ポンド = 188.68円
    USD: 1.27,    // 1ポンド = 1.27ドル
    EUR: 1.18,    // 1ポンド = 1.18ユーロ
  }
}

// 通貨設定
export const CURRENCY_CONFIG = {
  JP: { 
    code: 'JPY', 
    locale: 'ja-JP', 
    symbol: '¥',
    name: '日本円'
  },
  EN: { 
    code: 'USD', 
    locale: 'en-US', 
    symbol: '$',
    name: 'US Dollar'
  }
}

// 通貨変換関数
export const convertCurrency = (
  amount: string, 
  fromCurrency: string, 
  toCurrency: string
): number => {
  const amountNum = parseFloat(amount)
  
  if (fromCurrency === toCurrency) {
    return amountNum
  }
  
  const rate = EXCHANGE_RATES[fromCurrency]?.[toCurrency]
  if (!rate) {
    console.warn(`Exchange rate not found: ${fromCurrency} to ${toCurrency}`)
    return amountNum
  }
  
  return amountNum * rate
}

// 価格フォーマット関数
export const formatPrice = (
  amount: string, 
  originalCurrencyCode: string, 
  targetCurrencyCode: string,
  locale: string = 'ja-JP'
): string => {
  const convertedAmount = convertCurrency(amount, originalCurrencyCode, targetCurrencyCode)
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrencyCode,
  }).format(convertedAmount)
}

// 実際の為替レートを取得する関数（将来の実装用）
export const fetchRealTimeExchangeRate = async (
  fromCurrency: string, 
  toCurrency: string
): Promise<number> => {
  try {
    // 実際のプロダクションでは、以下のような外部APIを使用
    // const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`)
    // const data = await response.json()
    // return data.rates[toCurrency]
    
    // 現在は固定レートを返す
    return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1
  } catch (error) {
    console.error('Failed to fetch exchange rate:', error)
    return EXCHANGE_RATES[fromCurrency]?.[toCurrency] || 1
  }
}

// 通貨情報を取得
export const getCurrencyInfo = (currencyCode: string) => {
  const currencyMap: { [key: string]: { symbol: string; name: string; locale: string } } = {
    JPY: { symbol: '¥', name: '日本円', locale: 'ja-JP' },
    USD: { symbol: '$', name: 'US Dollar', locale: 'en-US' },
    EUR: { symbol: '€', name: 'Euro', locale: 'de-DE' },
    GBP: { symbol: '£', name: 'British Pound', locale: 'en-GB' },
  }
  
  return currencyMap[currencyCode] || { symbol: currencyCode, name: currencyCode, locale: 'en-US' }
}
