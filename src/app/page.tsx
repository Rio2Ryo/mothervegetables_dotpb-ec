'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to MAIN agent page
    router.replace('/MAIN/products')
  }, [router])

  return null
}
