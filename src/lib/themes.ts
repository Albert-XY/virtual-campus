export type ThemeId = 'journal' | 'pixel' | 'zen' | 'magazine' | 'star-citizen' | 'mirrors-edge'

export interface ThemeConfig {
  id: ThemeId
  name: string
  description: string
  preview: string
  fonts: {
    display: string
    body: string
    googleUrl: string
  }
  colors: {
    bg: string
    bgSecondary: string
    fg: string
    fgSecondary: string
    muted: string
    accent: string
    accentHover: string
    card: string
    cardHover: string
    border: string
    success: string
    warning: string
    danger: string
  }
  sceneColors: {
    library: string
    studyRoom: string
    dormitory: string
  }
}

export const themes: Record<ThemeId, ThemeConfig> = {
  journal: {
    id: 'journal',
    name: '温暖手账风',
    description: '暖色调纸张质感，像贴在手账上的纸片，温馨治愈',
    preview: '📖',
    fonts: {
      display: "'ZCOOL XiaoWei', serif",
      body: "'Noto Serif SC', serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;500;700&family=ZCOOL+XiaoWei&display=swap',
    },
    colors: {
      bg: '#FBF7F0',
      bgSecondary: '#F5EDE0',
      fg: '#3D3229',
      fgSecondary: '#7A6B5D',
      muted: '#B8A48C',
      accent: '#C4704B',
      accentHover: '#B5623D',
      card: '#FFFCF7',
      cardHover: '#FFF8ED',
      border: '#E8DDD0',
      success: '#6B8F5E',
      warning: '#D4A030',
      danger: '#C25B56',
    },
    sceneColors: {
      library: '#5B7B6F',
      studyRoom: '#8B6F4E',
      dormitory: '#7B6B8A',
    },
  },
  pixel: {
    id: 'pixel',
    name: '像素游戏风',
    description: '8-bit复古游戏世界，像素网格与霓虹色彩',
    preview: '🎮',
    fonts: {
      display: "'Press Start 2P', monospace",
      body: "'ZCOOL QingKe HuangYou', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=ZCOOL+QingKe+HuangYou&display=swap',
    },
    colors: {
      bg: '#1A1A2E',
      bgSecondary: '#16213E',
      fg: '#E8E8E8',
      fgSecondary: '#A8A8B3',
      muted: '#606080',
      accent: '#E94560',
      accentHover: '#FF5577',
      card: '#0F3460',
      cardHover: '#1A4080',
      border: '#533483',
      success: '#4ECCA3',
      warning: '#FFE66D',
      danger: '#FF4444',
    },
    sceneColors: {
      library: '#4ECCA3',
      studyRoom: '#E94560',
      dormitory: '#533483',
    },
  },
  zen: {
    id: 'zen',
    name: '日式极简风',
    description: '留白与克制，和纸质感，无印良品般的宁静',
    preview: '⛩️',
    fonts: {
      display: "'Noto Serif JP', serif",
      body: "'Noto Sans JP', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@400;500;700&display=swap',
    },
    colors: {
      bg: '#FAFAF8',
      bgSecondary: '#F0EDE8',
      fg: '#2C2C2C',
      fgSecondary: '#888888',
      muted: '#A0A0A0',
      accent: '#C73E3A',
      accentHover: '#B52E2A',
      card: '#FFFFFF',
      cardHover: '#FAF8F5',
      border: '#E0DCD5',
      success: '#5B8C5A',
      warning: '#C49A3C',
      danger: '#B85C5C',
    },
    sceneColors: {
      library: '#2C2C2C',
      studyRoom: '#5B8C5A',
      dormitory: '#C73E3A',
    },
  },
  magazine: {
    id: 'magazine',
    name: '潮流杂志风',
    description: '大胆撞色与霓虹发光，Z世代潮流视觉',
    preview: '📰',
    fonts: {
      display: "'Outfit', sans-serif",
      body: "'DM Sans', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&display=swap',
    },
    colors: {
      bg: '#0D0D0D',
      bgSecondary: '#1A1A1A',
      fg: '#FFFFFF',
      fgSecondary: '#999999',
      muted: '#666666',
      accent: '#FF3D00',
      accentHover: '#E63500',
      card: '#141414',
      cardHover: '#1E1E1E',
      border: '#2A2A2A',
      success: '#00E676',
      warning: '#FFD600',
      danger: '#FF1744',
    },
    sceneColors: {
      library: '#00E5FF',
      studyRoom: '#FF3D00',
      dormitory: '#AA00FF',
    },
  },
  'star-citizen': {
    id: 'star-citizen',
    name: '星际公民风',
    description: '深空全息投影，蓝色辉光与半透明面板，沉浸式科幻座舱',
    preview: '🚀',
    fonts: {
      display: "'Rajdhani', sans-serif",
      body: "'Share Tech Mono', monospace",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&display=swap',
    },
    colors: {
      bg: '#0A1628',
      bgSecondary: '#0D1F3C',
      fg: '#FFFFFF',
      fgSecondary: '#AACCEE',
      muted: '#6699BB',
      accent: '#0099DD',
      accentHover: '#33BBFF',
      card: 'rgba(0, 30, 60, 0.6)',
      cardHover: 'rgba(0, 40, 80, 0.8)',
      border: 'rgba(0, 153, 221, 0.3)',
      success: '#00CC66',
      warning: '#FF8800',
      danger: '#FF3344',
    },
    sceneColors: {
      library: '#0099DD',
      studyRoom: '#00CC66',
      dormitory: '#AA00FF',
    },
  },
  'mirrors-edge': {
    id: 'mirrors-edge',
    name: '镜之边缘风',
    description: '极简纯净与高对比红色指引，跑者视角的极致克制美学',
    preview: '🏃',
    fonts: {
      display: "'Outfit', sans-serif",
      body: "'Inter', sans-serif",
      googleUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&display=swap',
    },
    colors: {
      bg: '#F5F5F5',
      bgSecondary: '#FFFFFF',
      fg: '#1A1A1A',
      fgSecondary: '#555555',
      muted: '#999999',
      accent: '#E8302A',
      accentHover: '#FF5550',
      card: '#FFFFFF',
      cardHover: '#F8F8F8',
      border: 'rgba(0, 0, 0, 0.1)',
      success: '#2E7D32',
      warning: '#F5A623',
      danger: '#CC0000',
    },
    sceneColors: {
      library: '#E8302A',
      studyRoom: '#F5A623',
      dormitory: '#4A90D9',
    },
  },
}

export const themeIds: ThemeId[] = ['journal', 'pixel', 'zen', 'magazine', 'star-citizen', 'mirrors-edge']

export const DEFAULT_THEME: ThemeId = 'journal'

const THEME_STORAGE_KEY = 'virtual-campus-theme'

export function getStoredTheme(): ThemeId {
  if (typeof window === 'undefined') return DEFAULT_THEME
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    if (stored && themeIds.includes(stored as ThemeId)) {
      return stored as ThemeId
    }
  } catch {
    // ignore
  }
  return DEFAULT_THEME
}

export function setStoredTheme(theme: ThemeId): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // ignore
  }
}

export function applyTheme(theme: ThemeId): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
}
