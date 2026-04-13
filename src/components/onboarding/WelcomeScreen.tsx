'use client'

import { useGuide } from '../GuideProvider'
import { Sparkles, ArrowRight, BookOpen, Coffee, Zap, Cloud } from 'lucide-react'

export default function WelcomeScreen() {
  const { character, completeWelcome, setShowWelcome } = useGuide()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="absolute inset-0 overflow-hidden">
        {/* 装饰性背景元素 */}
        <div className="absolute top-20 left-10 animate-pulse">
          <BookOpen size={40} style={{ color: 'var(--accent-color)', opacity: 0.3 }} />
        </div>
        <div className="absolute top-40 right-20 animate-pulse" style={{ animationDelay: '0.5s' }}>
          <Coffee size={35} style={{ color: 'var(--accent-color)', opacity: 0.3 }} />
        </div>
        <div className="absolute bottom-40 left-20 animate-pulse" style={{ animationDelay: '1s' }}>
          <Zap size={30} style={{ color: 'var(--accent-color)', opacity: 0.3 }} />
        </div>
        <div className="absolute bottom-20 right-10 animate-pulse" style={{ animationDelay: '1.5s' }}>
          <Cloud size={45} style={{ color: 'var(--accent-color)', opacity: 0.3 }} />
        </div>
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 py-12 text-center">
        {/* 角色头像 */}
        <div className="mb-8">
          <div 
            className="inline-flex items-center justify-center w-24 h-24 rounded-full text-5xl animate-bounce"
            style={{
              backgroundColor: 'var(--accent-color)',
              boxShadow: `0 0 40px var(--accent-color)`,
            }}
          >
            {character.avatar}
          </div>
        </div>

        {/* 欢迎标题 */}
        <div className="mb-6">
          <h1 
            className="text-3xl font-bold mb-2"
            style={{ 
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-display)'
            }}
          >
            欢迎来到虚拟校园！
          </h1>
          <div className="flex items-center justify-center gap-2 text-lg">
            <span style={{ color: 'var(--text-secondary)' }}>我是</span>
            <span 
              className="font-semibold"
              style={{ color: 'var(--accent-color)' }}
            >
              {character.name}
            </span>
          </div>
        </div>

        {/* 介绍文本 */}
        <div className="mb-8">
          <p 
            className="text-base leading-relaxed mb-4"
            style={{ color: 'var(--text-secondary)' }}
          >
            这不是一个普通的工具，而是一个让你"生活"在学习中的地方。
          </p>
          <p 
            className="text-base leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            让我带你探索这个神奇的学习世界吧！
          </p>
        </div>

        {/* 核心价值 */}
        <div className="mb-10 grid grid-cols-2 gap-4">
          <div 
            className="p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-center mb-2">
              <Sparkles size={24} style={{ color: 'var(--accent-color)' }} />
            </div>
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              沉浸式环境
            </p>
          </div>
          <div 
            className="p-4 rounded-xl"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div className="flex items-center justify-center mb-2">
              <BookOpen size={24} style={{ color: 'var(--accent-color)' }} />
            </div>
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              完整流程
            </p>
          </div>
        </div>

        {/* 按钮 */}
        <div className="space-y-3">
          <button
            onClick={completeWelcome}
            className="w-full py-4 px-6 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
            style={{ backgroundColor: 'var(--accent-color)' }}
          >
            <span>开始探索</span>
            <ArrowRight size={20} />
          </button>
          
          <button
            onClick={() => setShowWelcome(false)}
            className="w-full py-3 px-6 rounded-xl font-medium transition-all active:scale-[0.97]"
            style={{ color: 'var(--text-muted)' }}
          >
            跳过引导
          </button>
        </div>
      </div>

      {/* 样式 */}
      <style jsx>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}
