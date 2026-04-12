'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Image, Video, Type, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { Broadcast, BroadcastContentType } from '@/types'

interface BroadcastWithViewed extends Broadcast {
  viewed: boolean
}

const contentTypeLabels: Record<BroadcastContentType, string> = {
  text: '文字',
  image: '图片',
  video: '视频',
}

const contentTypeIcons: Record<BroadcastContentType, React.ReactNode> = {
  text: <Type className="size-3.5" />,
  image: <Image className="size-3.5" />,
  video: <Video className="size-3.5" />,
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

export default function BroadcastsPage() {
  const router = useRouter()
  const [broadcasts, setBroadcasts] = useState<BroadcastWithViewed[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBroadcasts() {
      try {
        setLoading(true)
        const res = await fetch('/api/broadcasts')
        if (!res.ok) {
          throw new Error('获取播报失败')
        }
        const data = await res.json()
        setBroadcasts(data.broadcasts ?? [])
      } catch (err) {
        console.error('获取播报列表失败:', err)
        toast.error('获取播报列表失败')
      } finally {
        setLoading(false)
      }
    }
    fetchBroadcasts()
  }, [])

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="px-4 py-4">
      {/* 头部 */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center rounded-lg p-1.5 transition-colors"
          style={{
            color: 'var(--text-secondary)',
            backgroundColor: 'transparent',
          }}
        >
          <ArrowLeft className="size-5" />
        </button>
        <h1
          className="text-lg font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          播报存档
        </h1>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <span style={{ color: 'var(--text-secondary)' }}>加载中...</span>
        </div>
      )}

      {/* 空状态 */}
      {!loading && broadcasts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <span
            className="mb-2 text-4xl"
            role="img"
            aria-label="empty"
          >
            📢
          </span>
          <p style={{ color: 'var(--text-secondary)' }}>暂无播报</p>
        </div>
      )}

      {/* 播报列表 - 时间线样式 */}
      {!loading && broadcasts.length > 0 && (
        <div className="relative space-y-0">
          {/* 时间线竖线 */}
          <div
            className="absolute left-[15px] top-2 bottom-2 w-px"
            style={{ backgroundColor: 'var(--border-color)' }}
          />

          {broadcasts.map((broadcast) => {
            const isExpanded = expandedId === broadcast.id

            return (
              <div key={broadcast.id} className="relative flex gap-4 py-3">
                {/* 时间线圆点 */}
                <div className="relative z-10 mt-1.5 flex shrink-0">
                  <div
                    className="size-[10px] rounded-full"
                    style={{
                      backgroundColor: broadcast.viewed
                        ? 'var(--text-secondary)'
                        : 'var(--accent-color)',
                    }}
                  />
                </div>

                {/* 卡片内容 */}
                <Card
                  className="w-full cursor-pointer transition-shadow hover:shadow-md"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-color)',
                  }}
                  onClick={() => toggleExpand(broadcast.id)}
                >
                  <CardContent className="p-3">
                    {/* 标题行 */}
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className="text-sm font-semibold leading-snug"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {broadcast.title}
                      </h3>
                      {/* 已读/未读状态 */}
                      <span className="shrink-0">
                        {broadcast.viewed ? (
                          <Eye
                            className="size-3.5"
                            style={{ color: 'var(--text-secondary)' }}
                          />
                        ) : (
                          <EyeOff
                            className="size-3.5"
                            style={{ color: 'var(--accent-color)' }}
                          />
                        )}
                      </span>
                    </div>

                    {/* 元信息行 */}
                    <div className="mt-1.5 flex items-center gap-2">
                      {/* 内容类型标签 */}
                      <span
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: 'var(--accent-color)',
                          color: '#fff',
                          opacity: 0.85,
                        }}
                      >
                        {contentTypeIcons[broadcast.content_type]}
                        {contentTypeLabels[broadcast.content_type]}
                      </span>

                      {/* 发布时间 */}
                      <span
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        {formatDate(broadcast.published_at)}
                      </span>
                    </div>

                    {/* 展开内容 */}
                    {isExpanded && (
                      <div
                        className="mt-3"
                        style={{
                          borderTop: '1px solid var(--border-color)',
                          paddingTop: '12px',
                        }}
                      >
                        {/* 文字内容 */}
                        {broadcast.content_type === 'text' && (
                          <div
                            className="whitespace-pre-wrap text-sm leading-relaxed"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {broadcast.content}
                          </div>
                        )}

                        {/* 图片内容 */}
                        {broadcast.content_type === 'image' &&
                          broadcast.media_url && (
                            <div className="space-y-2">
                              <img
                                src={broadcast.media_url}
                                alt={broadcast.title}
                                className="w-full rounded-lg object-cover"
                                style={{ maxHeight: '300px' }}
                              />
                              {broadcast.content && (
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {broadcast.content}
                                </p>
                              )}
                            </div>
                          )}

                        {/* 视频内容 */}
                        {broadcast.content_type === 'video' &&
                          broadcast.media_url && (
                            <div className="space-y-2">
                              <video
                                src={broadcast.media_url}
                                controls
                                className="w-full rounded-lg"
                                style={{ maxHeight: '300px' }}
                              />
                              {broadcast.content && (
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: 'var(--text-secondary)' }}
                                >
                                  {broadcast.content}
                                </p>
                              )}
                            </div>
                          )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
