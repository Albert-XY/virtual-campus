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
  // Grid position (percentage-based within the map)
  x: number
  y: number
  width: number
  height: number
  cssVar: string
}

// ============================================================
// Building definitions
// ============================================================
const buildings: BuildingDef[] = [
  {
    id: 'library',
    name: '图书馆',
    emoji: '\u{1F4DA}',
    x: 12,
    y: 8,
    width: 30,
    height: 22,
    cssVar: 'scene-library',
  },
  {
    id: 'study-room',
    name: '自习室',
    emoji: '\u270F\uFE0F',
    x: 58,
    y: 8,
    width: 30,
    height: 22,
    cssVar: 'scene-study',
  },
  {
    id: 'dormitory',
    name: '宿舍',
    emoji: '\u{1F3E0}',
    x: 12,
    y: 60,
    width: 30,
    height: 22,
    cssVar: 'scene-dorm',
  },
  {
    id: 'exam-center',
    name: '考试中心',
    emoji: '\u{1F512}',
    x: 58,
    y: 60,
    width: 30,
    height: 22,
    cssVar: 'scene-dorm',
  },
]

// Tree positions (x%, y%)
const trees = [
  { x: 5, y: 4 },
  { x: 25, y: 2 },
  { x: 48, y: 3 },
  { x: 70, y: 2 },
  { x: 92, y: 4 },
  { x: 5, y: 50 },
  { x: 48, y: 52 },
  { x: 92, y: 50 },
  { x: 5, y: 88 },
  { x: 25, y: 90 },
  { x: 48, y: 88 },
  { x: 70, y: 90 },
  { x: 92, y: 88 },
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
      return true // all buildings warm
    case 'night':
      return buildingId === 'dormitory' || buildingId === 'library' || buildingId === 'study-room'
    case 'late-night':
      return buildingId === 'dormitory'
  }
}

function getSkyGradient(period: TimePeriod): string {
  switch (period) {
    case 'morning':
      return 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 40%, #FFCC80 100%)'
    case 'daytime':
      return 'linear-gradient(180deg, #E3F2FD 0%, #BBDEFB 40%, #90CAF9 100%)'
    case 'evening':
      return 'linear-gradient(180deg, #FF8A65 0%, #FF7043 40%, #E64A19 100%)'
    case 'night':
      return 'linear-gradient(180deg, #1A237E 0%, #283593 40%, #3949AB 100%)'
    case 'late-night':
      return 'linear-gradient(180deg, #0D0D2B 0%, #1A1A3E 40%, #0D0D2B 100%)'
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
// Sub-components
// ============================================================

function Tree({ x, y, period }: { x: number; y: number; period: TimePeriod }) {
  const isDark = period === 'night' || period === 'late-night'
  const trunkColor = isDark ? '#3E2723' : '#795548'
  const leafColor = isDark ? '#1B5E20' : '#4CAF50'
  const leafHighlight = isDark ? '#2E7D32' : '#66BB6A'

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-50%, -50%)',
        width: 28,
        height: 32,
      }}
    >
      {/* Trunk */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 6,
          height: 10,
          backgroundColor: trunkColor,
          borderRadius: 1,
        }}
      />
      {/* Canopy */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 22,
          height: 22,
          backgroundColor: leafColor,
          borderRadius: '50%',
          boxShadow: `inset -3px -3px 0 ${leafHighlight}, 0 2px 4px rgba(0,0,0,0.15)`,
        }}
      />
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
  const sceneColor = `var(--${building.cssVar})`
  const sceneBg = `var(--${building.cssVar}-bg, var(--bg-card))`

  const buildingBg = useMemo(() => {
    if (!isLit) {
      return isDark ? 'rgba(30,30,50,0.7)' : 'rgba(180,180,180,0.5)'
    }
    return sceneBg
  }, [isLit, isDark, sceneBg])

  const glowStyle = useMemo(() => {
    if (!isLit) return {}
    return {
      boxShadow: isDark
        ? `0 0 20px rgba(255,200,100,0.3), 0 0 40px rgba(255,200,100,0.1), inset 0 0 15px rgba(255,200,100,0.1)`
        : `0 0 12px rgba(255,255,200,0.3), inset 0 0 8px rgba(255,255,200,0.1)`,
    }
  }, [isLit, isDark])

  const opacity = isLit ? 1 : 0.55

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
        transition: 'transform 0.2s ease, opacity 0.5s ease',
      }}
      className={isUnlocked && !isActive ? 'campus-building-hover' : ''}
    >
      {/* Building body */}
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: 'var(--radius-md, 12px)',
          backgroundColor: buildingBg,
          border: `2px solid ${isLit ? sceneColor : (isDark ? 'rgba(60,60,80,0.5)' : 'rgba(150,150,150,0.5)')}`,
          opacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.5s ease',
          ...glowStyle,
        }}
      >
        {/* Window glow effect for lit buildings */}
        {isLit && (
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '15%',
              width: '20%',
              height: '15%',
              borderRadius: 2,
              backgroundColor: isDark ? 'rgba(255,200,100,0.6)' : 'rgba(255,255,200,0.4)',
              boxShadow: isDark ? '0 0 6px rgba(255,200,100,0.5)' : 'none',
            }}
          />
        )}
        {isLit && (
          <div
            style={{
              position: 'absolute',
              top: '10%',
              right: '15%',
              width: '20%',
              height: '15%',
              borderRadius: 2,
              backgroundColor: isDark ? 'rgba(255,200,100,0.6)' : 'rgba(255,255,200,0.4)',
              boxShadow: isDark ? '0 0 6px rgba(255,200,100,0.5)' : 'none',
            }}
          />
        )}

        {/* Emoji */}
        <span style={{ fontSize: 28, lineHeight: 1, filter: isLit ? 'none' : 'grayscale(0.8)' }}>
          {building.emoji}
        </span>

        {/* Name */}
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isLit ? sceneColor : (isDark ? 'rgba(150,150,170,0.7)' : 'rgba(120,120,120,0.7)'),
            whiteSpace: 'nowrap',
          }}
        >
          {building.name}
        </span>

        {/* Lock icon for locked buildings */}
        {!isUnlocked && (
          <div
            style={{
              position: 'absolute',
              top: 4,
              right: 6,
              fontSize: 12,
              opacity: 0.6,
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
              top: 4,
              left: 6,
              fontSize: 14,
              lineHeight: 1,
            }}
          >
            {'\u2705'}
          </div>
        )}

        {/* Active pulse */}
        {isActive && (
          <>
            <div
              style={{
                position: 'absolute',
                inset: -3,
                borderRadius: 'var(--radius-md, 12px)',
                border: `2px solid ${sceneColor}`,
                animation: 'campusPulse 2s ease-in-out infinite',
              }}
            />
            <div
              style={{
                position: 'absolute',
                inset: -6,
                borderRadius: 'var(--radius-md, 12px)',
                border: `1px solid ${sceneColor}`,
                animation: 'campusPulse 2s ease-in-out infinite 0.5s',
                opacity: 0.5,
              }}
            />
          </>
        )}

        {/* Duration label */}
        {isVisited && durationLabel && (
          <div
            style={{
              position: 'absolute',
              bottom: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 10,
              color: isDark ? 'rgba(180,180,200,0.8)' : 'rgba(80,80,80,0.8)',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}
          >
            {durationLabel}
          </div>
        )}
      </div>

      {/* Locked tooltip */}
      {!isUnlocked && (
        <div
          style={{
            position: 'absolute',
            bottom: -20,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
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
      ? 'rgba(100,100,120,0.3)'
      : 'rgba(150,150,150,0.4)'

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

  // Stars for night
  const stars = useMemo(() => {
    if (period !== 'night' && period !== 'late-night') return null
    const starList = []
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 100
      const y = Math.random() * 40
      const size = 1 + Math.random() * 2
      const opacity = 0.3 + Math.random() * 0.7
      const delay = Math.random() * 3
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
            animation: `campusTwinkle ${2 + Math.random() * 2}s ease-in-out infinite ${delay}s`,
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
          aspectRatio: '4 / 3',
          borderRadius: 'var(--radius-lg, 16px)',
          backgroundColor: 'var(--bg-card)',
        }}
      />
    )
  }

  return (
    <div className={className}>
      {/* CSS animations */}
      <style>{`
        @keyframes campusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.04); }
        }
        @keyframes campusTwinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .campus-building-hover:hover {
          transform: scale(1.06);
        }
        .campus-building-hover:hover > div {
          filter: brightness(1.08);
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
        {/* Sky */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '4 / 3',
            background: skyGradient,
            transition: 'background 1s ease',
          }}
        >
          {/* Stars */}
          {stars}

          {/* Ground area */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '85%',
              backgroundColor: groundColor,
              borderTopLeftRadius: '40% 20px',
              borderTopRightRadius: '40% 20px',
              transition: 'background-color 1s ease',
            }}
          />

          {/* Central plaza */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40%',
              height: '16%',
              borderRadius: '50%',
              backgroundColor: period === 'night' || period === 'late-night'
                ? 'rgba(60,60,80,0.3)'
                : 'rgba(200,190,170,0.5)',
              border: `1px dashed ${period === 'night' || period === 'late-night'
                ? 'rgba(100,100,120,0.3)'
                : 'rgba(160,150,130,0.5)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: textCol,
                opacity: 0.6,
                fontWeight: 500,
                letterSpacing: 2,
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
