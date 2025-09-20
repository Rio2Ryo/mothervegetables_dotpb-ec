'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import CartIcon from '@/components/cart/CartIcon'

export default function Header() {
  const { language, setLanguage, t } = useLanguage()

  const downloadWhitepaper = () => {
    const link = document.createElement('a')
    if (language === 'JP') {
      link.href = '/wh_ja.pdf'
      link.download = 'MOTHER_VEGETABLES_Whitepaper_JP.pdf'
    } else {
      link.href = '/wh_en.pdf'
      link.download = 'MOTHER_VEGETABLES_Whitepaper_EN.pdf'
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-md border-b border-green-500/20" style={{ zIndex: 1100 }}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image
                src="/logo-uCgt3dQl.png"
                alt="MOTHER VEGETABLES"
                width={100}
                height={100}
              />
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex items-center space-x-1 lg:space-x-2">
            <Link
              href="/"
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'ホーム', EN: 'Home' })}
            </Link>
            <Link
              href="/products"
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: '商品一覧', EN: 'All Products' })}
            </Link>
            <a
              href="https://dotpb.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'プロダクト', EN: 'Products' })}
            </a>
            <button
              onClick={downloadWhitepaper}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'ホワイトペーパー', EN: 'Whitepaper' })}
            </button>
            <button
              onClick={() => setLanguage(language === 'EN' ? 'JP' : 'EN')}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300 border border-gray-600 rounded-md"
            >
              {language === 'EN' ? 'EN' : 'JP'}
            </button>
            <CartIcon />
            {/*<button
              onClick={() => window.location.href = 'mailto:info@mothervegetables.com'}
              className="px-3 md:px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all duration-300"
            >
              事前登録
            </button>*/}
          </nav>
        </div>
      </div>
    </header>
  )
}

