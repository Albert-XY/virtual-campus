'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import DeviationChart from './DeviationChart'
import StudyTimeChart from './StudyTimeChart'
import CompletionChart from './CompletionChart'
import AccuracyChart from './AccuracyChart'

export default function TrendSection() {
  const [expanded, setExpanded] = useState(false)
  const [days, setDays] = useState(7)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5"
          >
            <CardTitle style={{ color: 'var(--text-primary)' }}>学习趋势</CardTitle>
            {expanded ? (
              <ChevronUp className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            ) : (
              <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
            )}
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDays(7)}
              className="rounded-md px-2 py-0.5 text-xs transition-colors"
              style={{
                backgroundColor: days === 7 ? 'var(--primary, #6366F1)' : 'transparent',
                color: days === 7 ? '#fff' : 'var(--text-secondary, #6b7280)',
              }}
            >
              7天
            </button>
            <button
              onClick={() => setDays(30)}
              className="rounded-md px-2 py-0.5 text-xs transition-colors"
              style={{
                backgroundColor: days === 30 ? 'var(--primary, #6366F1)' : 'transparent',
                color: days === 30 ? '#fff' : 'var(--text-secondary, #6b7280)',
              }}
            >
              30天
            </button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                偏差率趋势
              </p>
              <DeviationChart days={days} />
            </div>
            <div>
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                学习时长趋势
              </p>
              <StudyTimeChart days={days} />
            </div>
            <div>
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                完成率趋势
              </p>
              <CompletionChart days={days} />
            </div>
            <div>
              <p
                className="mb-1 text-xs font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                准确率趋势
              </p>
              <AccuracyChart days={days} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
