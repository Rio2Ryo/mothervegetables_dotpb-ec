'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react'

type Language = 'JP' | 'EN'
type Currency = 'JPY' | 'USD'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (translations: { JP: string; EN: string }) => string
  currency: Currency
  countryCode: string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('EN')

  // 初回マウント時にlocalStorageから言語設定を読み込む
  useEffect(() => {
    const stored = localStorage.getItem('language')
    if (stored === 'JP' || stored === 'EN') {
      setLanguageState(stored as Language)
    }
  }, [])

  // 言語設定を更新してlocalStorageに保存
  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('language', lang)
  }

  const t = (translations: { JP: string; EN: string }) => {
    return translations[language]
  }

  // 言語に基づいて通貨と国コードを決定
  // JP: 日本マーケット（JPY）
  // EN: 国際マーケット（USD） - USではなく、国際マーケットに含まれる国を使用
  const currency: Currency = language === 'JP' ? 'JPY' : 'USD'
  // 国際マーケットにアクセスするため、日本以外の国コードを使用
  // 例：シンガポール、香港、カナダなど国際マーケットに含まれる国
  const countryCode = language === 'JP' ? 'JP' : 'SG'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currency, countryCode }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}