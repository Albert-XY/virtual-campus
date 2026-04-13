'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'

// ============================================================
// Types
// ============================================================
interface CampusMapProps {
  activeScene: string | null
  timeline?: Array<{
    scene: string
    checked_in_at: string
    duration_minutes: number | null
  }>
  sceneStatus?: Record<string, {
    unlocked: boolean
    tasksCompleted: number
    tasksTotal: number
    focusMinutes: number
  }>
  onBuildingClick?: (scene: string) => void
  className?: string
}

interface BuildingDef {
  id: string
  name: string
  emoji: string
  x: number
  y: number
  width: number
  height: number
  cssVar: string
}

// ============================================================
// Building definitions — wider layout, 3:4 portrait
// ============================================================
const buildings: BuildingDef[] = [
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    x: 8,
    y: 10,
    width: 38,
    height: 20,
    cssVar: 'scene-library',
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    x: 54,
    y: 10,
    width: 38,
    height: 20,
    cssVar: 'scene-study',
  },
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F3E0}',
    x: 8,
    y: 62,
    width: 38,
    height: 20,
    cssVar: 'scene-dorm',
  },
  {
    id: 'exam-center',
    name: '考试中心',
    emoji: '\u{1F512}',
    x: 54,
    y: 62,
    width: 38,
    height: 20,
    cssVar: 'scene-dorm',
  },
]

// Tree positions (x%, y%) — repositioned for 3:4 layout
const trees = [
  { x: 4, y: 6 },
  { x: 30, y: 4 },
  { x: 50, y: 5 },
  { x: 70, y: 4 },
  { x: 96, y: 6 },
  { x: 4, y: 46 },
  { x: 50, y: 48 },
  { x: 96, y: 46 },
  { x: 4, y: 90 },
  { x: 30, y: 92 },
  { x: 50, y: 90 },
  { x: 70, y: 92 },
  { x: 96, y: 90 },
]

// Path definitions: [fromBuildingId, toBuildingId]
const paths: [string, string][] = [
  ['library', 'study-room'],
  ['library', 'dormitory'],
  ['study-room', 'exam-center'],
  ['dormitory', 'exam-center'],
  ['library', 'exam-center'],
  ['study-room', 'dormitory'],
]

// ============================================================
// Time helpers
// ============================================================
type TimePeriod = 'morning' | 'daytime' | 'evening' | 'night' | 'late-night'

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 18) return 'daytime'
  if (hour >= 18 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 22) return 'night'
  return 'late-night'
}

function isBuildingLit(buildingId: string, period: TimePeriod): boolean {
  switch (period) {
    case 'morning':
      return buildingId === 'dormitory'
    case 'daytime':
      return buildingId === 'library' || buildingId === 'study-room'
    case 'evening':
      return true
    case 'night':
      return buildingId === 'dormitory' || buildingId === 'library' || buildingId === 'study-room'
    case 'late-night':
      return buildingId === 'dormitory'
  }
}

function getSkyGradient(period: TimePeriod): string {
  switch (period) {
    case 'morning':
      return 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 35%, #FFCC80 70%, #A5D6A7 100%)'
    case 'daytime':
      return 'linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 30%, #90CAF9 60%, #A5D6A7 100%)'
    case 'evening':
      return 'linear-gradient(180deg, #FF8A65 0%, #FF7043 30%, #E64A19 60%, #6D4C41 100%)'
    case 'night':
      return 'linear-gradient(180deg, #0D0D2B 0%, #1A1A3E 30%, #1A237E 60%, #1B3A1B 100%)'
    case 'late-night':
      return 'linear-gradient(180deg, #050515 0%, #0D0D2B 30%, #0D0D2B 60%, #0F1F0F 100%)'
  }
}

function getGroundColor(period: TimePeriod): string {
  switch (period) {
    case 'morning':
      return '#C8E6C9'
    case 'daytime':
      return '#A5D6A7'
    case 'evening':
      return '#8D6E63'
    case 'night':
      return '#2E4A2E'
    case 'late-night':
      return '#1B3A1B'
  }
}

function getGroundPattern(period: TimePeriod): string {
  const isDark = period === 'night' || period === 'late-night'
  if (isDark) {
    return `
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 8px,
        rgba(255,255,255,0.02) 8px,
        rgba(255,255,255,0.02) 9px
      ),
      repeating-linear-gradient(
        0deg,
        transparent,
        transparent 8px,
        rgba(255,255,255,0.015) 8px,
        rgba(255,255,255,0.015) 9px
      )
    `
  }
  return `
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 6px,
      rgba(0,0,0,0.03) 6px,
      rgba(0,0,0,0.03) 7px
    ),
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 6px,
      rgba(0,0,0,0.02) 6px,
      rgba(0,0,0,0.02) 7px
    )
  `
}

function getTextColor(period: TimePeriod): string {
  switch (period) {
    case 'morning':
    case 'daytime':
      return '#333333'
    case 'evening':
      return '#FFF3E0'
    case 'night':
    case 'late-night':
      return '#B0BEC5'
  }
}

function formatDuration(minutes: number | null): string {
  if (minutes === null || minutes === undefined) return ''
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

// ============================================================
// Building color palettes
// ============================================================
interface BuildingPalette {
  wall: string
  wallDark: string
  roof: string
  roofDark: string
  windowGlow: string
  windowGlowStrong: string
  door: string
  wallTexture: string
}

function getBuildingPalette(buildingId: string, period: TimePeriod): BuildingPalette {
  const isDark = period === 'night' || period === 'late-night'
  const isEvening = period === 'evening'

  switch (buildingId) {
    case 'library':
      return {
        wall: isDark ? '#B8A472' : isEvening ? '#E8D8B0' : '#F5E6C8',
        wallDark: isDark ? '#9E8A58' : '#D4C4A0',
        roof: isDark ? '#5D4037' : '#6D4C41',
        roofDark: isDark ? '#3E2723' : '#4E342E',
        windowGlow: isDark ? 'rgba(255,200,80,0.7)' : 'rgba(255,220,100,0.4)',
        windowGlowStrong: isDark ? 'rgba(255,200,80,0.9)' : 'rgba(255,220,100,0.5)',
        door: isDark ? '#4E342E' : '#5D4037',
        wallTexture: isDark
          ? 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.05) 4px, rgba(0,0,0,0.05) 5px)'
          : 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)',
      }
    case 'study-room':
      return {
        wall: isDark ? '#7E9BAF' : isEvening ? '#B0CCE0' : '#C8E0F0',
        wallDark: isDark ? '#6A8899' : '#A0BCD0',
        roof: isDark ? '#37474F' : '#455A64',
        roofDark: isDark ? '#263238' : '#37474F',
        windowGlow: isDark ? 'rgba(200,220,255,0.7)' : 'rgba(255,255,255,0.4)',
        windowGlowStrong: isDark ? 'rgba(200,220,255,0.9)' : 'rgba(255,255,255,0.5)',
        door: isDark ? '#37474F' : '#455A64',
        wallTexture: isDark
          ? 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,0,0,0.04) 5px, rgba(0,0,0,0.04) 6px)'
          : 'repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(0,0,0,0.02) 5px, rgba(0,0,0,0.02) 6px)',
      }
    case 'dormitory':
      return {
        wall: isDark ? '#C49A6C' : isEvening ? '#F0C8A0' : '#F5D5B0',
        wallDark: isDark ? '#A88050' : '#E0B890',
        roof: isDark ? '#7B3B3B' : '#8D4949',
        roofDark: isDark ? '#5C2A2A' : '#6D3A3A',
        windowGlow: isDark ? 'rgba(255,180,60,0.7)' : 'rgba(255,200,100,0.4)',
        windowGlowStrong: isDark ? 'rgba(255,180,60,0.9)' : 'rgba(255,200,100,0.5)',
        door: isDark ? '#5C2A2A' : '#6D3A3A',
        wallTexture: isDark
          ? 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)'
          : 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.02) 3px, rgba(0,0,0,0.02) 4px)',
      }
    case 'exam-center':
    default:
      return {
        wall: isDark ? '#6B6B7B' : isEvening ? '#B0B0B8' : '#C8C8D0',
        wallDark: isDark ? '#555565' : '#A0A0A8',
        roof: isDark ? '#3A3A4A' : '#4A4A5A',
        roofDark: isDark ? '#2A2A3A' : '#3A3A4A',
        windowGlow: isDark ? 'rgba(120,120,140,0.3)' : 'rgba(160,160,180,0.2)',
        windowGlowStrong: isDark ? 'rgba(120,120,140,0.4)' : 'rgba(160,160,180,0.3)',
        door: isDark ? '#2A2A3A' : '#3A3A4A',
        wallTexture: isDark
          ? 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.06) 4px, rgba(0,0,0,0.06) 5px)'
          : 'repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 5px)',
      }
  }
}

// ============================================================
// Sub-components
// ============================================================

function Tree({ x, y, period }: { x: number; y: number; period: TimePeriod }) {
  const isDark = period === 'night' || period === 'late-night'
  const trunkColor = isDark ? '#3E2723' : '#795548'
  const leafColor = isDark ? '#1B5E20' : '#4CAF50'
  const leafHighlight = isDark ? '#2E7D32' : '#66BB6A'
  const leafShadow = isDark ? '#0D3B0D' : '#388E3C'

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: 32,
        height: 38,
        zIndex: 3,
      }}
    >
      {/* Shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 24,
          height: 6,
          borderRadius: '50%',
          backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
        }}
      />
      {/* Trunk */}
      <div
        style={{
          position: 'absolute',
          bottom: 2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 7,
          height: 12,
          backgroundColor: trunkColor,
          borderRadius: '0 0 2px 2px',
          boxShadow: `inset -1px 0 0 ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.1)'}`,
        }}
      />
      {/* Back canopy */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          left: '50%',
          transform: 'translateX(-40%)',
          width: 20,
          height: 20,
          backgroundColor: leafShadow,
          borderRadius: '50%',
        }}
      />
      {/* Main canopy */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 24,
          height: 24,
          backgroundColor: leafColor,
          borderRadius: '50%',
          boxShadow: `inset -4px -4px 0 ${leafHighlight}, inset 3px 3px 0 ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)'}`,
        }}
      />
      {/* Highlight spot */}
      <div
        style={{
          position: 'absolute',
          top: 4,
          left: '50%',
          transform: 'translateX(-60%)',
          width: 8,
          height: 6,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.2)',
          borderRadius: '50%',
        }}
      />
    </div>
  )
}

function Cloud({ x, y, scale, period }: { x: number; y: number; scale: number; period: TimePeriod }) {
  const isDark = period === 'night' || period === 'late-night'
  const isEvening = period === 'evening'
  const color = isDark
    ? 'rgba(40,40,70,0.4)'
    : isEvening
      ? 'rgba(255,180,130,0.5)'
      : 'rgba(255,255,255,0.85)'

  return (
    <div
      className="campus-cloud"
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `scale(${scale})`,
        zIndex: 1,
        opacity: isDark ? 0.3 : 1,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: 60,
          height: 20,
        }}
      >
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 10,
            width: 40,
            height: 16,
            backgroundColor: color,
            borderRadius: 8,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 6,
            left: 16,
            width: 24,
            height: 20,
            backgroundColor: color,
            borderRadius: '50%',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            left: 30,
            width: 18,
            height: 16,
            backgroundColor: color,
            borderRadius: '50%',
          }}
        />
      </div>
    </div>
  )
}

function Building({
  building,
  isActive,
  isLit,
  isVisited,
  isUnlocked,
  durationLabel,
  period,
  onClick,
}: {
  building: BuildingDef
  isActive: boolean
  isLit: boolean
  isVisited: boolean
  isUnlocked: boolean
  durationLabel: string
  period: TimePeriod
  onClick: () => void
}) {
  const isDark = period === 'night' || period === 'late-night'
  const palette = getBuildingPalette(building.id, period)
  const sceneColor = `var(--${building.cssVar})`

  const isExamCenter = building.id === 'exam-center'
  const windowCount = isExamCenter ? 2 : 4

  return (
    <div
      onClick={isUnlocked && !isActive ? onClick : undefined}
      style={{
        position: 'absolute',
        left: `${building.x}%`,
        top: `${building.y}%`,
        width: `${building.width}%`,
        height: `${building.height}%`,
        cursor: isUnlocked && !isActive ? 'pointer' : 'default',
        zIndex: isActive ? 20 : isUnlocked ? 10 : 5,
        transition: 'transform 0.2s ease',
      }}
      className={isUnlocked && !isActive ? 'campus-building-hover' : ''}
    >
      {/* Building shadow */}
      <div
        style={{
          position: 'absolute',
          bottom: '-4px',
          left: '8%',
          width: '84%',
          height: '12%',
          borderRadius: '50%',
          backgroundColor: isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)',
          filter: 'blur(3px)',
        }}
      />

      {/* Roof — wider than wall, triangular-ish with border-radius */}
      <div
        style={{
          position: 'absolute',
          top: '-12%',
          left: '-6%',
          width: '112%',
          height: '35%',
          background: `linear-gradient(180deg, ${palette.roofDark} 0%, ${palette.roof} 100%)`,
          borderRadius: '6px 6px 2px 2px',
          boxShadow: `0 2px 4px ${isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)'}`,
          zIndex: 2,
        }}
      >
        {/* Roof ridge line */}
        <div
          style={{
            position: 'absolute',
            top: '30%',
            left: '10%',
            width: '80%',
            height: '2px',
            backgroundColor: palette.roofDark,
            borderRadius: 1,
            opacity: 0.6,
          }}
        />
        {/* Roof highlight */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '15%',
            width: '70%',
            height: '3px',
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.15)',
            borderRadius: 2,
          }}
        />
      </div>

      {/* Wall body */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          background: `
            ${palette.wallTexture},
            linear-gradient(180deg, ${palette.wall} 0%, ${palette.wallDark} 100%)
          `,
          borderRadius: '0 0 6px 6px',
          border: `2px solid ${isLit ? palette.wallDark : (isDark ? 'rgba(60,60,80,0.5)' : 'rgba(150,150,150,0.5)')}`,
          borderTop: 'none',
          opacity: isLit ? 1 : 0.55,
          overflow: 'hidden',
          transition: 'all 0.5s ease',
          boxShadow: isLit && isDark
            ? `0 0 20px rgba(255,200,100,0.15), 0 0 40px rgba(255,200,100,0.05)`
            : 'none',
        }}
      >
        {/* Windows row */}
        <div
          style={{
            position: 'absolute',
            top: '18%',
            left: '10%',
            right: '10%',
            height: '22%',
            display: 'flex',
            justifyContent: 'space-around',
            gap: '4%',
          }}
        >
          {Array.from({ length: windowCount }).map((_, i) => {
            const isWindowLit = isLit && !isExamCenter
            const glowIntensity = isDark && isWindowLit ? 1 : isLit ? 0.5 : 0
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  maxWidth: '22%',
                  aspectRatio: '1 / 1.2',
                  backgroundColor: isWindowLit
                    ? palette.windowGlow
                    : isDark
                      ? 'rgba(30,30,50,0.6)'
                      : 'rgba(135,206,235,0.3)',
                  borderRadius: '2px 2px 1px 1px',
                  border: `1px solid ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)'}`,
                  boxShadow: isDark && isWindowLit
                    ? `0 0 8px ${palette.windowGlowStrong}, 0 0 16px ${palette.windowGlow}, inset 0 0 4px rgba(255,255,200,0.3)`
                    : isWindowLit
                      ? `0 0 4px ${palette.windowGlow}`
                      : 'none',
                  transition: 'all 0.5s ease',
                  position: 'relative',
                }}
              >
                {/* Window cross bar */}
                <div
                  style={{
                    position: 'absolute',
                    top: '45%',
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: '45%',
                    top: 0,
                    bottom: 0,
                    width: 1,
                    backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)',
                  }}
                />
                {/* Warm light spill below window */}
                {isDark && isWindowLit && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '-6px',
                      left: '-20%',
                      width: '140%',
                      height: '8px',
                      background: `radial-gradient(ellipse at center top, ${palette.windowGlow}, transparent)`,
                      opacity: 0.5,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Door */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '18%',
            height: '32%',
            backgroundColor: palette.door,
            borderRadius: '4px 4px 0 0',
            border: `1px solid ${isDark ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.15)'}`,
            boxShadow: isDark && isLit
              ? `0 0 10px rgba(255,200,100,0.2), inset 0 0 5px rgba(255,200,100,0.1)`
              : 'none',
          }}
        >
          {/* Door knob */}
          <div
            style={{
              position: 'absolute',
              right: '18%',
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 3,
              borderRadius: '50%',
              backgroundColor: isDark ? 'rgba(200,200,200,0.4)' : 'rgba(200,180,100,0.8)',
            }}
          />
          {/* Door light from inside */}
          {isLit && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '15%',
                width: '70%',
                height: '40%',
                background: `linear-gradient(180deg, ${palette.windowGlow}, transparent)`,
                borderRadius: '2px 2px 0 0',
                opacity: isDark ? 0.6 : 0.3,
              }}
            />
          )}
        </div>

        {/* Lock icon for locked buildings */}
        {!isUnlocked && (
          <div
            style={{
              position: 'absolute',
              top: '8%',
              right: '8%',
              fontSize: 14,
              opacity: 0.7,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
            }}
          >
            {'\u{1F512}'}
          </div>
        )}

        {/* Visited checkmark */}
        {isVisited && !isActive && (
          <div
            style={{
              position: 'absolute',
              top: '8%',
              left: '8%',
              fontSize: 14,
              lineHeight: 1,
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))',
            }}
          >
            {'\u2705'}
          </div>
        )}

        {/* Active pulse rings */}
        {isActive && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: '0 0 8px 8px',
                border: `2px solid ${sceneColor}`,
                animation: 'campusPulse 2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -7,
                borderRadius: '0 0 10px 10px',
                border: `1px solid ${sceneColor}`,
                animation: 'campusPulse 2s ease-in-out infinite 0.5s',
                opacity: 0.5,
              }}
            />
          </>
        )}
      </div>

      {/* Name label */}
      <div
        style={{
          position: 'absolute',
          bottom: '-22px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '2px 10px',
          borderRadius: 10,
          backgroundColor: isDark ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(4px)',
          whiteSpace: 'nowrap',
          zIndex: 15,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: isLit
              ? (isDark ? '#FFE0B2' : '#5D4037')
              : (isDark ? 'rgba(150,150,170,0.7)' : 'rgba(120,120,120,0.7)'),
            letterSpacing: 1,
          }}
        >
          {building.name}
        </span>
      </div>

      {/* Duration label */}
      {isVisited && durationLabel && (
        <div
          style={{
            position: 'absolute',
            bottom: '-38px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: isDark ? 'rgba(180,180,200,0.8)' : 'rgba(80,80,80,0.8)',
            whiteSpace: 'nowrap',
            fontWeight: 500,
            zIndex: 15,
          }}
        >
          {durationLabel}
        </div>
      )}

      {/* Locked tooltip */}
      {!isUnlocked && (
        <div
          style={{
            position: 'absolute',
            bottom: '-38px',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            zIndex: 15,
          }}
        >
          需要先规划
        </div>
      )}
    </div>
  )
}

function PathLine({
  from,
  to,
  isVisited,
  period,
}: {
  from: BuildingDef
  to: BuildingDef
  isVisited: boolean
  period: TimePeriod
}) {
  const isDark = period === 'night' || period === 'late-night'
  const x1 = from.x + from.width / 2
  const y1 = from.y + from.height / 2
  const x2 = to.x + to.width / 2
  const y2 = to.y + to.height / 2

  const pathColor = isVisited
    ? 'var(--accent-color)'
    : isDark
      ? 'rgba(100,100,120,0.25)'
      : 'rgba(150,150,150,0.35)'

  const strokeWidth = isVisited ? 2.5 : 1.5
  const dashArray = isVisited ? 'none' : '6 4'
  const filter = isVisited
    ? 'drop-shadow(0 0 4px var(--accent-color))'
    : 'none'

  return (
    <line
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
      stroke={pathColor}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeLinecap="round"
      style={{
        filter,
        transition: 'stroke 0.5s ease, stroke-width 0.3s ease',
      }}
    />
  )
}

// ============================================================
// Main component
// ============================================================
export default function CampusMap({
  activeScene,
  timeline = [],
  sceneStatus = {},
  onBuildingClick,
  className = '',
}: CampusMapProps) {
  const [currentHour, setCurrentHour] = useState<number>(12)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const update = () => setCurrentHour(new Date().getHours())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  const period = useMemo(() => getTimePeriod(currentHour), [currentHour])
  const skyGradient = useMemo(() => getSkyGradient(period), [period])
  const groundColor = useMemo(() => getGroundColor(period), [period])
  const groundPattern = useMemo(() => getGroundPattern(period), [period])
  const textCol = useMemo(() => getTextColor(period), [period])

  // Compute visited scenes from timeline
  const visitedScenes = useMemo(() => {
    const set = new Set<string>()
    timeline.forEach((entry) => set.add(entry.scene))
    return set
  }, [timeline])

  // Compute visited path pairs
  const visitedPathSet = useMemo(() => {
    const set = new Set<string>()
    for (let i = 0; i < timeline.length - 1; i++) {
      const a = timeline[i].scene
      const b = timeline[i + 1].scene
      set.add(`${a}-${b}`)
      set.add(`${b}-${a}`)
    }
    return set
  }, [timeline])

  // Compute duration per scene
  const sceneDurations = useMemo(() => {
    const map: Record<string, number> = {}
    timeline.forEach((entry) => {
      if (entry.duration_minutes) {
        map[entry.scene] = (map[entry.scene] || 0) + entry.duration_minutes
      }
    })
    return map
  }, [timeline])

  const buildingMap = useMemo(() => {
    const m: Record<string, BuildingDef> = {}
    buildings.forEach((b) => (m[b.id] = b))
    return m
  }, [])

  const handleBuildingClick = useCallback(
    (scene: string) => {
      onBuildingClick?.(scene)
    },
    [onBuildingClick]
  )

  // Stars for night — bigger, brighter, with twinkle
  const stars = useMemo(() => {
    if (period !== 'night' && period !== 'late-night') return null
    const starList = []
    for (let i = 0; i < 35; i++) {
      const x = Math.random() * 100
      const y = Math.random() * 35
      const size = 1.5 + Math.random() * 2.5
      const opacity = 0.4 + Math.random() * 0.6
      const delay = Math.random() * 4
      const duration = 2 + Math.random() * 3
      starList.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            opacity,
            animation: `campusTwinkle ${duration}s ease-in-out infinite ${delay}s`,
            boxShadow: `0 0 ${size * 2}px rgba(255,255,255,0.4)`,
          }}
        />
      )
    }
    return starList
  }, [period])

  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          aspectRatio: '3 / 4',
          borderRadius: 'var(--radius-lg, 16px)',
          backgroundColor: 'var(--bg-card)',
        }}
      />
    )
  }

  const isDark = period === 'night' || period === 'late-night'
  const isDaytime = period === 'daytime' || period === 'morning'

  return (
    <div className={className}>
      {/* CSS animations */}
      <style>{`
        @keyframes campusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
        }
        @keyframes campusTwinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes cloudFloat {
          0%, 100% { transform: translateX(0) scale(1); }
          50% { transform: translateX(8px) scale(1); }
        }
        .campus-building-hover:hover {
          transform: scale(1.05);
        }
        .campus-building-hover:hover > div:last-of-type {
          filter: brightness(1.08);
        }
        .campus-cloud {
          animation: cloudFloat 12s ease-in-out infinite;
        }
        .campus-cloud:nth-child(2) {
          animation-delay: -4s;
          animation-duration: 15s;
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          borderRadius: 'var(--radius-lg, 16px)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-lg, 0 4px 16px rgba(0,0,0,0.12))',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Sky + Ground container — 3:4 portrait */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 4',
            background: skyGradient,
            transition: 'background 1s ease',
            overflow: 'hidden',
          }}
        >
          {/* Stars */}
          {stars}

          {/* Clouds (daytime only) */}
          {isDaytime && (
            <>
              <Cloud x={15} y={5} scale={0.8} period={period} />
              <Cloud x={65} y={8} scale={0.6} period={period} />
            </>
          )}

          {/* Ground area with rolling hills */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '82%',
              background: `
                ${groundPattern},
                ${groundColor}
              `,
              borderTopLeftRadius: '50% 30px',
              borderTopRightRadius: '50% 30px',
              transition: 'background-color 1s ease',
            }}
          >
            {/* Second hill layer for depth */}
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                left: '10%',
                right: '10%',
                height: '20px',
                background: `
                  ${groundPattern},
                  ${isDark ? '#2A422A' : '#9CCC9C'}
                `,
                borderRadius: '50%',
                opacity: 0.6,
              }}
            />
          </div>

          {/* Central plaza — cobblestone texture */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '36%',
              height: '14%',
              borderRadius: 16,
              background: isDark
                ? `
                  radial-gradient(circle at 20% 30%, rgba(80,80,100,0.3) 0%, transparent 3px),
                  radial-gradient(circle at 60% 70%, rgba(80,80,100,0.3) 0%, transparent 3px),
                  radial-gradient(circle at 40% 20%, rgba(80,80,100,0.25) 0%, transparent 2px),
                  radial-gradient(circle at 80% 40%, rgba(80,80,100,0.25) 0%, transparent 2px),
                  radial-gradient(circle at 30% 80%, rgba(80,80,100,0.2) 0%, transparent 3px),
                  rgba(40,50,40,0.4)
                `
                : `
                  radial-gradient(circle at 20% 30%, rgba(180,170,150,0.6) 0%, transparent 4px),
                  radial-gradient(circle at 60% 70%, rgba(180,170,150,0.6) 0%, transparent 4px),
                  radial-gradient(circle at 40% 20%, rgba(190,180,160,0.5) 0%, transparent 3px),
                  radial-gradient(circle at 80% 40%, rgba(190,180,160,0.5) 0%, transparent 3px),
                  radial-gradient(circle at 30% 80%, rgba(170,160,140,0.4) 0%, transparent 4px),
                  radial-gradient(circle at 70% 50%, rgba(185,175,155,0.5) 0%, transparent 3px),
                  rgba(210,200,180,0.5)
                `,
              border: `1.5px dashed ${isDark ? 'rgba(100,100,120,0.3)' : 'rgba(160,150,130,0.5)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4,
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: textCol,
                opacity: 0.6,
                fontWeight: 500,
                letterSpacing: 2,
                textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 2px rgba(255,255,255,0.5)',
              }}
            >
              小路广场
            </span>
          </div>

          {/* SVG paths layer */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {paths.map(([fromId, toId]) => {
              const from = buildingMap[fromId]
              const to = buildingMap[toId]
              if (!from || !to) return null
              const key = `${fromId}-${toId}`
              return (
                <PathLine
                  key={key}
                  from={from}
                  to={to}
                  isVisited={visitedPathSet.has(key)}
                  period={period}
                />
              )
            })}
          </svg>

          {/* Trees */}
          {trees.map((tree, i) => (
            <Tree key={i} x={tree.x} y={tree.y} period={period} />
          ))}

          {/* Buildings */}
          {buildings.map((b) => {
            const status = sceneStatus[b.id]
            const isUnlocked = status?.unlocked ?? (b.id === 'dormitory')
            const isActive = activeScene === b.id
            const isVisited = visitedScenes.has(b.id)
            const isLit = isBuildingLit(b.id, period)
            const duration = sceneDurations[b.id]

            return (
              <Building
                key={b.id}
                building={b}
                isActive={isActive}
                isLit={isLit}
                isVisited={isVisited}
                isUnlocked={isUnlocked}
                durationLabel={formatDuration(duration || null)}
                period={period}
                onClick={() => handleBuildingClick(b.id)}
              />
            )
          })}

          {/* Time indicator */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 10,
              fontSize: 10,
              color: textCol,
              opacity: 0.5,
              fontWeight: 500,
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              textShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : 'none',
            }}
          >
            {period === 'morning' && '\u2600\uFE0F'}
            {period === 'daytime' && '\u{1F324}\uFE0F'}
            {period === 'evening' && '\u{1F305}'}
            {period === 'night' && '\u{1F319}'}
            {period === 'late-night' && '\u{1F31F}'}
            {currentHour.toString().padStart(2, '0')}:00
          </div>
        </div>
      </div>
    </div>
  )
}
