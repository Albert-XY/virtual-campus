'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Volume2, VolumeX, Volume1 } from 'lucide-react'
import { getAmbientEngine, type AmbientPreset } from '@/lib/ambient-sound'

/**
 * AmbientPlayer - 环境音效播放器
 *
 * 沉浸式场景中的音效控制条。
 * 进入场景后自动播放，用户可以调节音量或关闭。
 * 设计为极简样式，不干扰学习体验。
 */

interface AmbientPlayerProps {
  preset: AmbientPreset
  /** 是否自动播放（默认 true） */
  autoPlay?: boolean
  /** 自定义样式类名 */
  className?: string
}

export default function AmbientPlayer({ preset, autoPlay = true, className = '' }: AmbientPlayerProps) {
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)
  const [playing, setPlaying] = useState(false)
  const engineRef = useRef<ReturnType<typeof getAmbientEngine> | null>(null)
  const hasInteracted = useRef(false)

  // 初始化引擎
  useEffect(() => {
    engineRef.current = getAmbientEngine()
    return () => {
      // 组件卸载时停止播放（但不销毁引擎，可能其他组件在用）
      engineRef.current?.stop()
    }
  }, [])

  // 自动播放（需要用户交互后才能播放音频）
  useEffect(() => {
    if (!autoPlay || !engineRef.current) return

    const handleInteraction = () => {
      if (!hasInteracted.current) {
        hasInteracted.current = true
        engineRef.current?.play(preset)
        setPlaying(true)
      }
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }

    // 如果用户已经交互过，直接播放
    if (hasInteracted.current) {
      engineRef.current.play(preset)
      setPlaying(true)
    } else {
      document.addEventListener('click', handleInteraction, { once: true })
      document.addEventListener('touchstart', handleInteraction, { once: true })
    }

    return () => {
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('touchstart', handleInteraction)
    }
  }, [preset, autoPlay])

  // 切换预设
  useEffect(() => {
    if (playing && engineRef.current) {
      engineRef.current.play(preset)
    }
  }, [preset, playing])

  // 音量控制
  const handleVolumeChange = useCallback((newVol: number) => {
    setVolume(newVol)
    engineRef.current?.setVolume(newVol)
  }, [])

  // 静音切换
  const handleToggleMute = useCallback(() => {
    const newMuted = !muted
    setMuted(newMuted)
    engineRef.current?.setMuted(newMuted)
  }, [muted])

  // 手动播放/停止
  const handleTogglePlay = useCallback(() => {
    if (playing) {
      engineRef.current?.stop()
      setPlaying(false)
    } else {
      hasInteracted.current = true
      engineRef.current?.play(preset)
      setPlaying(true)
    }
  }, [playing, preset])

  // 音量图标
  const VolumeIcon = muted || volume === 0 ? VolumeX : volume < 0.4 ? Volume1 : Volume2

  return (
    <div className={`ambient-player flex items-center gap-2 ${className}`}>
      {/* 播放/暂停按钮 */}
      <button
        onClick={handleTogglePlay}
        className="ambient-player__btn flex size-7 items-center justify-center rounded-full transition-colors hover:bg-white/10"
        title={playing ? '暂停环境音' : '播放环境音'}
      >
        <VolumeIcon className="size-3.5 opacity-60" />
      </button>

      {/* 音量滑块 */}
      {playing && (
        <div className="ambient-player__slider flex items-center gap-1.5">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value) / 100)}
            className="ambient-player__range h-1 w-16 cursor-pointer appearance-none rounded-full bg-white/20
              [&::-webkit-slider-thumb]:size-2.5 [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white/60
              [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-white/80"
          />
          <button
            onClick={handleToggleMute}
            className="text-[10px] opacity-40 hover:opacity-70 transition-opacity"
          >
            {muted ? '静音' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
