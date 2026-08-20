'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ContactoRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/legal?tab=contacto')
  }, [router])

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-xs text-stone-500">
      Redirigiendo a contacto...
    </div>
  )
}
