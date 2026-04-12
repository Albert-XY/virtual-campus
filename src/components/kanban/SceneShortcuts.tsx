'use client'

import Link from 'next/link'
import { BookOpen, Pencil, Moon, LogOut } from 'lucide-react'

// ============================================================
// Types
// ============================================================
interface SceneShortcutsProps {
  activeScene: {
    scene: string
    scene_name: string
    checkin_id: string
  } | null
  onOpenScene: (scene: 'library' | 'study-room') => void
  onLeaveScene: () => void
}

// ============================================================
// Component
// ============================================================
export default function SceneShortcuts({
  activeScene,
  onOpenScene,
  onLeaveScene,
}: SceneShortcutsProps) {
  return (
    <div className="space-y-2">
      {/* 当前场景提示 */}
      {activeScene && (
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'color-mix(in srgb, var(--accent-color) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent-color) 25%, transparent)',
          }}
        >
          <div className="flex items-center gap-2">
            <div
              className="size-2 rounded-full animate-pulse"
              style={{ backgroundColor: 'var(--accent-color)' }}
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              正在 <strong>{activeScene.scene_name}</strong> 中
            </span>
          </div>
          <button
            onClick={onLeaveScene}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 transition-colors"
            style={{
              borderRadius: 'var(--radius-sm)',
              color: 'var(--danger)',
              backgroundColor: 'color-mix(in srgb, var(--danger) 10%, transparent)',
            }}
          >
            <LogOut className="size-3" />
            离开
          </button>
        </div>
      )}

      {/* 场景快捷按钮 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 图书馆 */}
        <button
          onClick={() => onOpenScene('library')}
          className="flex flex-col items-center gap-1.5 p-3 transition-all active:scale-[0.97]"
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid color-mix(in srgb, var(--scene-library) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--scene-library) 8%, transparent)',
          }}
        >
          <BookOpen
            className="size-5"
            style={{ color: 'var(--scene-library)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--scene-library)' }}
          >
            图书馆
          </span>
        </button>

        {/* 自习室 */}
        <button
          onClick={() => onOpenScene('study-room')}
          className="flex flex-col items-center gap-1.5 p-3 transition-all active:scale-[0.97]"
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid color-mix(in srgb, var(--scene-study) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--scene-study) 8%, transparent)',
          }}
        >
          <Pencil
            className="size-5"
            style={{ color: 'var(--scene-study)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--scene-study)' }}
          >
            自习室
          </span>
        </button>

        {/* 宿舍 */}
        <Link
          href="/campus/dormitory"
          className="flex flex-col items-center gap-1.5 p-3 transition-all active:scale-[0.97]"
          style={{
            borderRadius: 'var(--radius-sm)',
            border: '1px solid color-mix(in srgb, var(--scene-dorm) 25%, transparent)',
            backgroundColor: 'color-mix(in srgb, var(--scene-dorm) 8%, transparent)',
          }}
        >
          <Moon
            className="size-5"
            style={{ color: 'var(--scene-dorm)' }}
          />
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--scene-dorm)' }}
          >
            宿舍
          </span>
        </Link>
      </div>
    </div>
  )
}
