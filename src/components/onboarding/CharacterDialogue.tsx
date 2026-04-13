'use client'

import { useGuide } from '../GuideProvider'
import { X, MessageSquare, ArrowRight } from 'lucide-react'

export default function CharacterDialogue() {
  const {
    character,
    currentDialogue,
    showDialogue,
    setShowDialogue
  } = useGuide()

  if (!showDialogue || !currentDialogue) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 pointer-events-none">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black/40 pointer-events-auto"
        onClick={() => setShowDialogue(false)}
      />

      {/* 对话气泡 */}
      <div className="relative z-10 max-w-md w-full pointer-events-auto">
        <div 
          className="rounded-2xl p-5 shadow-2xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
          }}
        >
          {/* 角色头部 */}
          <div className="flex items-start gap-4 mb-4">
            {/* 头像 */}
            <div 
              className="flex-shrink-0 w-14 h-14 rounded-full text-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              {character.avatar}
            </div>

            {/* 角色信息 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare size={16} style={{ color: 'var(--accent-color)' }} />
                <span 
                  className="font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {character.name}
                </span>
              </div>
              <p 
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {character.personality}
              </p>
            </div>

            {/* 关闭按钮 */}
            <button
              onClick={() => setShowDialogue(false)}
              className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={18} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>

          {/* 对话内容 */}
          <div className="mb-4">
            <p 
              className="text-base leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {currentDialogue.text}
            </p>
          </div>

          {/* 继续按钮 */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowDialogue(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white transition-all active:scale-[0.97]"
              style={{ backgroundColor: 'var(--accent-color)' }}
            >
              <span>继续</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>

        {/* 装饰性尖角 */}
        <div 
          className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0"
          style={{
            borderLeft: '8px solid transparent',
            borderRight: '8px solid transparent',
            borderBottom: `8px solid var(--bg-card)`,
          }}
        />
      </div>
    </div>
  )
}
