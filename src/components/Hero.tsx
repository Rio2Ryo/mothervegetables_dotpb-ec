'use client'

import Image from 'next/image'
import { useLanguage } from '@/contexts/LanguageContext'

export default function Hero() {
  const { t } = useLanguage()

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="/hero-earth-regeneration-Dnk2z_VF.png"
          alt="Earth Regeneration"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-7xl mx-auto px-4 transition-all duration-1500 pt-40 md:pt-48 lg:pt-56">
        {/* Title Section - Single Component */}
        <div className="mb-12">
          <div
            className="inline-block"
            style={{
              background: 'linear-gradient(135deg, #4ade80 0%, #22c55e 50%, #16a34a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(34, 197, 94, 0.2))',
            }}
          >
            <h1 className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-black leading-tight">
              <div>MOTHER VEGETABLES PROJECT</div>
            </h1>
          </div>
          <div className="w-40 md:w-48 h-1.5 bg-gradient-to-r from-transparent via-green-400 to-transparent mx-auto rounded-full mt-6 opacity-80"></div>
        </div>


        {/* Description - Not in Box */}
        <div className="max-w-4xl mx-auto mb-12 mt-20 px-4">
          <div className="space-y-3">
            <p className="text-lg md:text-xl text-white leading-relaxed">
              {t({
                JP: '35億年前の地球のはじまりの生命',
                EN: 'Life from the beginning of Earth 3.5 billion years ago'
              })}
            </p>
            <p className="text-lg md:text-xl text-white leading-relaxed">
              {t({
                JP: '「マザーベジタブル」',
                EN: '"Mother Vegetables"'
              })}
            </p>
            <p className="text-lg md:text-xl text-white leading-relaxed">
              {t({
                JP: '地球が生み出した生命力を、あなたに。',
                EN: 'Bringing you the life force created by Earth.'
              })}
            </p>
          </div>
        </div>

        {/* Mother Vegetables Image */}
        <div className="max-w-2xl mx-auto mb-12 px-4">
          <Image
            src="/mpic.jpg"
            alt="Mother Vegetables"
            width={600}
            height={400}
            className="w-full h-auto rounded-lg shadow-2xl"
            priority
          />
        </div>


      </div>
    </section>
  )
}