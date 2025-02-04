'use client'

import { useEffect } from 'react'
import { useScript } from '@/hooks/useScript'

interface ReCaptchaProps {
  onVerify: (token: string) => void
}

declare global {
  interface Window {
    grecaptcha: any
    onRecaptchaLoad: () => void
  }
}

export default function ReCaptcha({ onVerify }: ReCaptchaProps) {
  const status = useScript(
    `https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`
  )

  useEffect(() => {
    if (status === 'ready') {
      window.grecaptcha.ready(() => {
        window.grecaptcha.execute(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY, { action: 'submit' })
          .then((token: string) => {
            onVerify(token)
          })
      })
    }
  }, [status, onVerify])

  return null
} 