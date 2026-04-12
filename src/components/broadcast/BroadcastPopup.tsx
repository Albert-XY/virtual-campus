'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Megaphone } from 'lucide-react'
import type { Broadcast } from '@/types'

interface BroadcastPopupProps {
  onDismiss?: () => void
}

export default function BroadcastPopup({ onDismiss }: BroadcastPopupProps) {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)

  const current = broadcasts[currentIndex] ?? null

  // 获取未读播报
  const fetchUnread = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/broadcasts/view')
      if (!res.ok) {
        throw new Error('获取播报失败')
      }
      const data = await res.json()
      if (data.broadcasts && data.broadcasts.length > 0) {
        setBroadcasts(data.broadcasts)
        setVisible(true)
      }
    } catch (err) {
      console.error('获取未读播报失败:', err)
      toast.error('获取播报失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  // 标记当前播报为已读
  const markViewed = useCallback(async (broadcastId: string) => {
    try {
      await fetch('/api/broadcasts/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcast_id: broadcastId }),
      })
    } catch (err) {
      console.error('标记已读失败:', err)
    }
  }, [])

  // 关闭当前播报（标记已读）
  const handleClose = useCallback(() => {
    if (current) {
      markViewed(current.id)
    }
    setVisible(false)
    onDismiss?.()
  }, [current, markViewed, onDismiss])

  // 下一条播报
  const handleNext = useCallback(() => {
    if (current) {
      markViewed(current.id)
    }
    if (currentIndex < broadcasts.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    } else {
      // 所有播报已看完
      setVisible(false)
      onDismiss?.()
    }
  }, [current, currentIndex, broadcasts.length, markViewed, onDismiss])

  if (!visible || !current) return null

  const isLast = currentIndex === broadcasts.length - 1

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      {/* 弹窗卡片 - 点击外部不关闭 */}
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* 头部 */}
        <div
          className="flex items-center gap-2 px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-color)' }}
        >
          <Megaphone
            className="size-5 shrink-0"
            style={{ color: 'var(--accent-color)' }}
          />
          <h2
            className="text-base font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            校园播报
          </h2>
          <span
            className="ml-auto text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {currentIndex + 1} / {broadcasts.length}
          </span>
        </div>

        {/* 内容区域 */}
        <div className="px-5 py-4">
          {/* 标题 */}
          <h3
            className="mb-3 text-lg font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {current.title}
          </h3>

          {/* 根据内容类型渲染 */}
          {current.content_type === 'text' && (
            <div
              className="whitespace-pre-wrap rounded-lg p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-secondary, rgba(0,0,0,0.03))',
                color: 'var(--text-primary)',
              }}
            >
              {current.content}
            </div>
          )}

          {current.content_type === 'image' && current.media_url && (
            <div className="space-y-3">
              <img
                src={current.media_url}
                alt={current.title}
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '400px' }}
              />
              {current.content && (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {current.content}
                </p>
              )}
            </div>
          )}

          {current.content_type === 'video' && current.media_url && (
            <div className="space-y-3">
              <video
                src={current.media_url}
                controls
                autoPlay
                className="w-full rounded-lg"
                style={{ maxHeight: '400px' }}
              />
              {current.content && (
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {current.content}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div
          className="flex items-center justify-end gap-3 px-5 py-4"
          style={{ borderTop: '1px solid var(--border-color)' }}
        >
          <button
            onClick={handleClose}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              color: 'var(--text-secondary)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
            }}
          >
            关闭
          </button>
          {!isLast && (
            <button
              onClick={handleNext}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              下一条
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
