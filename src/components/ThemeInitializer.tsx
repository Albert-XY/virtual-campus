'use client'

import { useEffect } from 'react'
import { getStoredTheme, applyTheme } from '@/lib/themes'

export function ThemeInitializer() {
  useEffect(() => {
    const saved = getStoredTheme()
    applyTheme(saved)
  }, [])

  return null
}
