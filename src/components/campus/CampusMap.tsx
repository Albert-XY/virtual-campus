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
  x: number
  y: number
  width: number
  height: number
}

// ============================================================
// Fixed Mirror's Edge color palette
// ============================================================
const COLORS: Record<string, string> = {
  white: '#F5F5F5',
  pureWhite: '#FFFFFF',
  black: '#1A1A1A',
  red: '#E8302A',
  gray: '#999999',
  lightGray: '#F0F0F0',
  redDark: '#B02020',
  redNight: '#801515',
  redDeep: '#601010',
  grayDark: '#666666',
  grayLight: '#CCCCCC',
  grayMuted: '#AAAAAA',
}

// ============================================================
// Building definitions — vertical layout
// ============================================================
const buildings: BuildingDef[] = [
  {
    id: 'library',
    name: 'LIBRARY',
    x: 10,
    y: 8,
    width: 35,
    height: 18,
  },
  {
    id: 'study-room',
    name: 'STUDY ROOM',
    x: 55,
    y: 8,
    width: 35,
    height: 18,
  },
  {
    id: 'dormitory',
    name: 'DORMITORY',
    x: 25,
    y: 58,
    width: 50,
    height: 18,
  },
  {
    id: 'exam-center',
    name: 'EXAM CENTER',
    x: 25,
    y: 82,
    width: 50,
    height: 14,
  },
]

// ============================================================
// Path definitions: [fromBuildingId, toBuildingId]
// ============================================================
const paths: [string, string][] = [
  ['library', 'study-room'],
  ['library', 'dormitory'],
  ['study-room', 'dormitory'],
  ['dormitory', 'exam-center'],
]

// ============================================================
// Time helpers
// ============================================================
type TimePeriod = 'daytime' | 'evening' | 'night' | 'late-night'

function getTimePeriod(hour: number): TimePeriod {
  if (hour >= 6 && hour < 18) return 'daytime'
  if (hour >= 18 && hour < 20) return 'evening'
  if (hour >= 20 && hour < 23) return 'night'
  return 'late-night'
}

function getRedForPeriod(period: TimePeriod): string {
  switch (period) {
    case 'daytime': return COLORS.red
    case 'evening': return COLORS.redDark
    case 'night': return COLORS.redNight
    case 'late-night': return COLORS.redDeep
  }
}

function getBackgroundForPeriod(period: TimePeriod): string {
  switch (period) {
    case 'daytime': return COLORS.pureWhite
    case 'evening': return '#E8E8E8'
    case 'night': return '#C0C0C0'
    case 'late-night': return '#A0A0A0'
  }
}

function getBorderForPeriod(period: TimePeriod): string {
  switch (period) {
    case 'daytime': return COLORS.black
    case 'evening': return '#333333'
    case 'night': return '#555555'
    case 'late-night': return '#777777'
  }
}

function getTextColorForPeriod(period: TimePeriod): string {
  switch (period) {
    case 'daytime': return COLORS.black
    case 'evening': return '#333333'
    case 'night': return '#555555'
    case 'late-night': return '#777777'
  }
}

function getGlowForPeriod(period: TimePeriod): string {
  switch (period) {
    case 'daytime': return 'rgba(232, 48, 42, 0.4)'
    case 'evening': return 'rgba(176, 32, 32, 0.3)'
    case 'night': return 'rgba(128, 21, 21, 0.35)'
    case 'late-night': return 'rgba(96, 16, 16, 0.3)'
  }
}

function formatFocusMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}M FOCUS`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}H ${m}M FOCUS` : `${h}H FOCUS`
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
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null)
  const [flashBuilding, setFlashBuilding] = useState<string | null>(null)
  const [showLockedMsg, setShowLockedMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    const update = () => setCurrentHour(new Date().getHours())
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [])

  // Dismiss locked message after 2s
  useEffect(() => {
    if (showLockedMsg) {
      const t = setTimeout(() => setShowLockedMsg(null), 2000)
      return () => clearTimeout(t)
    }
  }, [showLockedMsg])

  const period = useMemo(() => getTimePeriod(currentHour), [currentHour])
  const red = useMemo(() => getRedForPeriod(period), [period])
  const bg = useMemo(() => getBackgroundForPeriod(period), [period])
  const border = useMemo(() => getBorderForPeriod(period), [period])
  const textCol = useMemo(() => getTextColorForPeriod(period), [period])
  const glow = useMemo(() => getGlowForPeriod(period), [period])

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

  const buildingMap = useMemo(() => {
    const m: Record<string, BuildingDef> = {}
    buildings.forEach((b) => (m[b.id] = b))
    return m
  }, [])

  const handleClick = useCallback(
    (buildingId: string) => {
      const status = sceneStatus[buildingId]
      const isUnlocked = status?.unlocked ?? (buildingId === 'dormitory')
      const isActive = activeScene === buildingId

      if (isActive) return

      if (!isUnlocked) {
        setShowLockedMsg(buildingId)
        return
      }

      // Flash effect
      setFlashBuilding(buildingId)
      setTimeout(() => {
        setFlashBuilding(null)
        onBuildingClick?.(buildingId)
      }, 200)
    },
    [activeScene, sceneStatus, onBuildingClick]
  )

  // ============================================================
  // SVG Path computation
  // ============================================================
  // We use right-angle paths (Manhattan routing) for that sharp geometric feel
  function getPathD(from: BuildingDef, to: BuildingDef): string {
    const fx = from.x + from.width / 2
    const fy = from.y + from.height / 2
    const tx = to.x + to.width / 2
    const ty = to.y + to.height / 2

    // Determine routing: go vertical first, then horizontal
    const midY = (fy + ty) / 2

    return `M ${fx} ${fy} L ${fx} ${midY} L ${tx} ${midY} L ${tx} ${ty}`
  }

  // Determine which path is the "recommended" path (from current active to next logical)
  const recommendedPath = useMemo(() => {
    if (!activeScene) return null
    // Recommend path from active building to any unlocked building not yet visited today
    for (const b of buildings) {
      if (b.id !== activeScene && !visitedScenes.has(b.id)) {
        const status = sceneStatus[b.id]
        const isUnlocked = status?.unlocked ?? (b.id === 'dormitory')
        if (isUnlocked) {
          return `${activeScene}-${b.id}`
        }
      }
    }
    return null
  }, [activeScene, visitedScenes, sceneStatus])

  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          aspectRatio: '3 / 4',
          backgroundColor: COLORS.white,
        }}
      />
    )
  }

  return (
    <div className={className}>
      <style>{`
        @keyframes mePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes meDashFlow {
          to { stroke-dashoffset: -20; }
        }
        @keyframes meFlash {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        @keyframes mePulseDot {
          0%, 100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.5; transform: translate(-50%, -50%) scale(1.8); }
        }
        @keyframes meFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes meFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        .me-building {
          transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
        }
        .me-building-clickable {
          cursor: pointer;
        }
        .me-building-clickable:hover {
          border-width: 2px !important;
          background-color: rgba(232, 48, 42, 0.04) !important;
        }
        .me-locked-msg {
          animation: meFadeIn 0.15s ease forwards;
        }
      `}</style>

      <div
        style={{
          width: '100%',
          maxWidth: 480,
          margin: '0 auto',
          overflow: 'hidden',
          border: `1px solid ${border}`,
          transition: 'background-color 1s ease, border-color 1s ease',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '3 / 4',
            background: `linear-gradient(180deg, ${bg} 0%, ${COLORS.lightGray} 100%)`,
            transition: 'background 1s ease',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif",
          }}
        >
          {/* SVG paths layer */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1,
            }}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {paths.map(([fromId, toId]) => {
              const from = buildingMap[fromId]
              const to = buildingMap[toId]
              if (!from || !to) return null
              const key = `${fromId}-${toId}`
              const reverseKey = `${toId}-${fromId}`
              const isVisited = visitedPathSet.has(key) || visitedPathSet.has(reverseKey)
              const isRecommended = recommendedPath === key || recommendedPath === reverseKey

              let strokeColor = red
              let strokeWidth = 1
              let dashArray = '4 3'
              let opacity = 0.4
              let filterStr = 'none'
              let animName = 'none'

              if (isVisited) {
                strokeColor = red
                strokeWidth = 2
                dashArray = 'none'
                opacity = 0.8
                filterStr = `drop-shadow(0 0 3px ${glow})`
              } else if (isRecommended) {
                strokeColor = red
                strokeWidth = 1.5
                dashArray = '6 4'
                opacity = 0.6
                animName = 'meDashFlow 1s linear infinite'
              }

              return (
                <path
                  key={key}
                  d={getPathD(from, to)}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  opacity={opacity}
                  style={{
                    filter: filterStr,
                    transition: 'opacity 0.5s ease, stroke-width 0.3s ease',
                    animation: animName,
                  }}
                />
              )
            })}
          </svg>

          {/* Buildings */}
          {buildings.map((b) => {
            const status = sceneStatus[b.id]
            const isUnlocked = status?.unlocked ?? (b.id === 'dormitory')
            const isActive = activeScene === b.id
            const isVisited = visitedScenes.has(b.id)
            const isHovered = hoveredBuilding === b.id
            const isFlashing = flashBuilding === b.id

            let borderColor = border
            let bgColor = COLORS.white
            let borderWidth = 1
            let nameColor = red
            let infoColor = COLORS.gray
            let opacity = 1
            let boxShadow = 'none'
            let borderStyle = 'solid'

            if (!isUnlocked) {
              borderColor = COLORS.grayLight
              borderStyle = 'dashed'
              nameColor = COLORS.grayMuted
              infoColor = COLORS.grayLight
              opacity = 0.7
            } else if (isActive) {
              borderColor = red
              borderWidth = 2
              bgColor = `rgba(232, 48, 42, 0.06)`
              boxShadow = `0 0 12px ${glow}, inset 0 0 8px rgba(232, 48, 42, 0.03)`
            } else if (isHovered) {
              borderColor = red
              borderWidth = 2
              bgColor = 'rgba(232, 48, 42, 0.03)'
            }

            if (isFlashing) {
              boxShadow = `0 0 20px ${glow}, 0 0 40px ${glow}`
            }

            const tasksCompleted = status?.tasksCompleted ?? 0
            const tasksTotal = status?.tasksTotal ?? 0
            const focusMinutes = status?.focusMinutes ?? 0

            return (
              <div
                key={b.id}
                onClick={() => handleClick(b.id)}
                onMouseEnter={() => setHoveredBuilding(b.id)}
                onMouseLeave={() => setHoveredBuilding(null)}
                className={isUnlocked && !isActive ? 'me-building me-building-clickable' : 'me-building'}
                style={{
                  position: 'absolute',
                  left: `${b.x}%`,
                  top: `${b.y}%`,
                  width: `${b.width}%`,
                  height: `${b.height}%`,
                  backgroundColor: bgColor,
                  border: `${borderWidth}px ${borderStyle} ${borderColor}`,
                  opacity,
                  boxShadow,
                  zIndex: isActive ? 20 : isUnlocked ? 10 : 5,
                  padding: '12px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  transition: 'all 0.15s ease',
                  animation: isFlashing ? 'meFlash 0.2s ease' : 'none',
                }}
              >
                {/* Active pulse border overlay */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -3,
                      border: `1px solid ${red}`,
                      animation: 'mePulse 2s ease-in-out infinite',
                      pointerEvents: 'none',
                    }}
                  />
                )}

                {/* Visited marker: red square */}
                {isVisited && !isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      left: 8,
                      width: 6,
                      height: 6,
                      backgroundColor: red,
                    }}
                  />
                )}

                {/* Building name */}
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    letterSpacing: 3,
                    color: nameColor,
                    lineHeight: 1,
                    marginBottom: 6,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {b.name}
                </div>

                {/* Red underline */}
                <div
                  style={{
                    width: '100%',
                    height: 1,
                    backgroundColor: isUnlocked ? red : COLORS.grayLight,
                    marginBottom: 8,
                    transition: 'background-color 0.15s ease',
                  }}
                />

                {/* Info lines */}
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 400,
                    letterSpacing: 1,
                    color: infoColor,
                    lineHeight: 1.6,
                    transition: 'color 0.15s ease',
                  }}
                >
                  {isUnlocked ? (
                    <>
                      <div>{tasksTotal > 0 ? `${tasksCompleted}/${tasksTotal} TASKS` : '-- TASKS'}</div>
                      <div>{focusMinutes > 0 ? formatFocusMinutes(focusMinutes) : '-- FOCUS'}</div>
                    </>
                  ) : (
                    <div style={{ color: COLORS.grayMuted }}>LOCKED</div>
                  )}
                </div>

                {/* Locked message */}
                {showLockedMsg === b.id && !isUnlocked && (
                  <div
                    className="me-locked-msg"
                    style={{
                      position: 'absolute',
                      bottom: -20,
                      left: 0,
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: 1,
                      color: red,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    COMPLETE PLAN TO UNLOCK
                  </div>
                )}

                {/* Active position dot */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: -8,
                      left: '50%',
                      width: 6,
                      height: 6,
                      backgroundColor: red,
                      transform: 'translate(-50%, 0)',
                      animation: 'mePulseDot 2s ease-in-out infinite',
                      boxShadow: `0 0 8px ${glow}`,
                    }}
                  />
                )}
              </div>
            )
          })}

          {/* Time indicator — minimal, top right */}
          <div
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: 2,
              color: COLORS.gray,
              zIndex: 30,
              lineHeight: 1,
            }}
          >
            {currentHour.toString().padStart(2, '0')}:00
          </div>

          {/* Minimal period label */}
          <div
            style={{
              position: 'absolute',
              top: 24,
              right: 12,
              fontSize: 8,
              fontWeight: 400,
              letterSpacing: 2,
              color: COLORS.grayLight,
              zIndex: 30,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            {period === 'daytime' && 'DAY'}
            {period === 'evening' && 'DUSK'}
            {period === 'night' && 'NIGHT'}
            {period === 'late-night' && 'LATE'}
          </div>
        </div>
      </div>
    </div>
  )
}
