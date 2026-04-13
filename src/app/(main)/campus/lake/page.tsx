'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Moon, Sun, Cloud } from 'lucide-react'
import AmbientPlayer from '@/components/ambient/AmbientPlayer'

// ============================================================
// 海神湖场景
// 「不是工具，是环境」
// 这里是休息、放松、发呆的地方
// ============================================================

interface LakeState {
  mode: 'breathing' | 'body-scan' | 'mindfulness'
  isActive: boolean
  currentStep: number
  totalSteps: number
  progress: number
}

export default function LakePage() {
  const router = useRouter()
  const [state, setState] = useState<LakeState>({
    mode: 'mindfulness',
    isActive: false,
    currentStep: 0,
    totalSteps: 10,
    progress: 0,
  })
  const [timeOfDay, setTimeOfDay] = useState<'day' | 'night'>('day')
  const [clouds, setClouds] = useState<Array<{ id: number; x: number; y: number; speed: number }>>([])

  // 初始化云朵
  useEffect(() => {
    const initialClouds = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: 10 + Math.random() * 30,
      speed: 0.05 + Math.random() * 0.1,
    }))
    setClouds(initialClouds)
  }, [])

  // 云朵动画
  useEffect(() => {
    const interval = setInterval(() => {
      setClouds(prev => prev.map(cloud => ({
        ...cloud,
        x: (cloud.x + cloud.speed) % 100,
      })))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // 切换模式
  const handleModeChange = useCallback((mode: LakeState['mode']) => {
    setState(prev => ({
      ...prev,
      mode,
      currentStep: 0,
      totalSteps: mode === 'breathing' ? 8 : mode === 'body-scan' ? 12 : 10,
      progress: 0,
    }))
  }, [])

  // 开始/暂停
  const handleToggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      isActive: !prev.isActive,
    }))
  }, [])

  // 湖水波动动画
  const waterAnimationStyle = {
    background: `linear-gradient(180deg, #4A90E2 0%, #50C878 100%)`,
    animation: 'waterWave 10s ease-in-out infinite',
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景 */}
      <div 
        className="absolute inset-0 transition-colors duration-1000"
        style={{
          background: timeOfDay === 'day' 
            ? 'linear-gradient(135deg, #87CEEB 0%, #E0F7FA 100%)' 
            : 'linear-gradient(135deg, #1A237E 0%, #303F9F 100%)',
        }}
      >
        {/* 云朵 */}
        {clouds.map(cloud => (
          <Cloud 
            key={cloud.id}
            className="absolute transition-opacity duration-500"
            style={{
              left: `${cloud.x}%`,
              top: `${cloud.y}%`,
              opacity: timeOfDay === 'day' ? 0.8 : 0.3,
              transform: `scale(${0.8 + Math.random() * 0.4})`,
              color: timeOfDay === 'day' ? '#FFFFFF' : '#E3F2FD',
            }}
            size={40 + Math.random() * 20}
          />
        ))}

        {/* 太阳/月亮 */}
        {timeOfDay === 'day' ? (
          <Sun 
            className="absolute top-10 right-10 animate-pulse"
            size={60}
            color="#FFEB3B"
          />
        ) : (
          <Moon 
            className="absolute top-10 right-10"
            size={60}
            color="#E3F2FD"
          />
        )}

        {/* 湖水 */}
        <div 
          className="absolute bottom-0 left-0 right-0 h-1/2"
          style={waterAnimationStyle}
        >
          <div className="absolute inset-0 opacity-20">
            {/* 波纹效果 */}
            {Array.from({ length: 5 }).map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full border-2 border-white animate-pulse"
                style={{
                  width: `${100 + i * 50}px`,
                  height: `${100 + i * 50}px`,
                  left: `${50 - (50 + i * 25)}px`,
                  top: `${50 - (50 + i * 25)}px`,
                  opacity: 0.3 - i * 0.05,
                  animationDelay: `${i * 2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div className="relative z-10 pt-8 px-6">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => router.back()}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm"
          >
            <ArrowLeft size={24} color="white" />
          </button>
          <h1 
            className="text-2xl font-bold text-white"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
          >
            海神湖
          </h1>
          <button 
            onClick={() => setTimeOfDay(prev => prev === 'day' ? 'night' : 'day')}
            className="p-2 rounded-full bg-white/20 backdrop-blur-sm"
          >
            {timeOfDay === 'day' ? (
              <Moon size={24} color="white" />
            ) : (
              <Sun size={24} color="white" />
            )}
          </button>
        </div>

        {/* 模式选择 */}
        <div className="flex justify-center space-x-4 mb-8">
          {[
            { mode: 'breathing' as const, label: '呼吸引导' },
            { mode: 'body-scan' as const, label: '身体扫描' },
            { mode: 'mindfulness' as const, label: '发呆模式' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => handleModeChange(mode)}
              className={`px-4 py-2 rounded-full transition-all ${state.mode === mode 
                ? 'bg-white text-blue-600 font-medium' 
                : 'bg-white/30 text-white backdrop-blur-sm'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 主要内容 */}
        <div className="max-w-md mx-auto bg-white/20 backdrop-blur-lg rounded-2xl p-6 shadow-xl">
          {state.mode === 'breathing' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">呼吸引导</h2>
              <p className="text-white/80 mb-6">跟随呼吸节奏，放松身心</p>
              <div className="flex justify-center mb-6">
                <div 
                  className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-4000 ease-in-out ${
                    state.isActive ? 'animate-pulse' : ''
                  }`}
                  style={{
                    background: 'rgba(255,255,255,0.3)',
                    transform: state.isActive ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  <div 
                    className="w-24 h-24 rounded-full bg-white/50 flex items-center justify-center"
                  >
                    <div 
                      className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center"
                    >
                      <span className="text-blue-600 font-bold">
                        {state.isActive ? '呼吸' : '准备'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-white mb-4">
                {state.isActive ? '吸气... 呼气...' : '点击开始'}
              </p>
            </div>
          )}

          {state.mode === 'body-scan' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">身体扫描</h2>
              <p className="text-white/80 mb-6">从头到脚放松每个部位</p>
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 relative">
                  {/* 简化的人体轮廓 */}
                  <div className="absolute inset-0 flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-white/60 mb-2"></div>
                    <div className="w-16 h-20 bg-white/60 rounded-full mb-2"></div>
                    <div className="flex space-x-4">
                      <div className="w-8 h-16 bg-white/60 rounded-full"></div>
                      <div className="w-8 h-16 bg-white/60 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-white mb-4">
                {state.isActive ? '专注于你的头部...' : '点击开始'}
              </p>
            </div>
          )}

          {state.mode === 'mindfulness' && (
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-4">发呆模式</h2>
              <p className="text-white/80 mb-6">什么都不用做，只是看着湖面</p>
              <div className="flex justify-center mb-6">
                <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center">
                  <Cloud size={40} color="white" />
                </div>
              </div>
              <p className="text-white mb-4">
                放松你的思绪，让它们像云朵一样飘过
              </p>
            </div>
          )}

          {/* 控制按钮 */}
          <button
            onClick={handleToggle}
            className={`w-full py-3 rounded-lg font-medium transition-all ${
              state.isActive 
                ? 'bg-red-500 text-white' 
                : 'bg-white text-blue-600'
            }`}
          >
            {state.isActive ? '暂停' : '开始'}
          </button>
        </div>

        {/* 环境音效控制 */}
        <div className="mt-8 max-w-md mx-auto">
          <AmbientPlayer preset="lake" />
        </div>
      </div>

      {/* 样式 */}
      <style jsx global>{`
        @keyframes waterWave {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  )
}