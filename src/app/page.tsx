'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Hero from '@/components/Hero'
import ProductCards from '@/components/ProductCards'
import ProjectOverview from '@/components/ProjectOverview'
import IndustryApproach from '@/components/IndustryApproach'
import TeamMembers from '@/components/TeamMembers'
import Partners from '@/components/Partners'
import TokenInfo from '@/components/TokenInfo'
import FAQ from '@/components/FAQ'
import Footer from '@/components/Footer'
import LoadingScreen from '@/components/LoadingScreen'

export default function Home() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      {isLoading && <LoadingScreen />}
      <main className="min-h-screen text-white relative">
        <Header />
        <Hero />
        <ProductCards />
        <ProjectOverview />
        <IndustryApproach />
        <TeamMembers />
        <Partners />
        <TokenInfo />{/* */}
        {/*<FAQ />*/}
        <Footer />
      </main>
    </>
  )
}
