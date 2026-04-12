'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { Loader2 } from 'lucide-react'

interface TrendData {
  labels: string[]
  values: number[]
}

interface StudyTimeChartProps {
  days?: number
}

export default function StudyTimeChart({ days = 7 }: StudyTimeChartProps) {
  const [data, setData] = useState<TrendData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetch(`/api/trends?metric=study_time&days=${days}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [days])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-secondary)' }} />
      </div>
    )
  }

  if (!data || data.values.every((v) => v === 0)) {
    return (
      <div className="flex h-40 items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
        暂无数据
      </div>
    )
  }

  const chartData = data.labels.map((label, i) => ({
    label,
    value: data.values[i],
  }))

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color, #e5e7eb)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--text-secondary, #6b7280)' }}
            axisLine={{ stroke: 'var(--border-color, #e5e7eb)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--text-secondary, #6b7280)' }}
            axisLine={{ stroke: 'var(--border-color, #e5e7eb)' }}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: unknown) => [`${value} 分钟`, '学习时长']}
            contentStyle={{
              backgroundColor: 'var(--card, #fff)',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Bar
            dataKey="value"
            fill="var(--primary, #6366F1)"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
