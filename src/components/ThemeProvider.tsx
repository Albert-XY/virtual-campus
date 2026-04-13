'use client'

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import type { ThemeId } from '@/lib/themes'
import { themes, themeIds, DEFAULT_THEME, getStoredTheme, setStoredTheme, applyTheme } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  mounted: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME,
  setTheme: () => {},
  mounted: false,
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(DEFAULT_THEME)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = getStoredTheme()
    setThemeState(saved)
    applyTheme(saved)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    applyTheme(theme)
    setStoredTheme(theme)

    // Update font link
    const fontLink = document.getElementById('theme-fonts') as HTMLLinkElement | null
    if (fontLink) {
      fontLink.href = themes[theme].fonts.googleUrl
    }

    // Dispatch theme change event for components like ThemeDecorations
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }))
    }
  }, [theme, mounted])

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}
