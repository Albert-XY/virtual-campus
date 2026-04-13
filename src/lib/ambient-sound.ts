/**
 * AmbientSoundEngine - 环境音效引擎
 *
 * 使用 Web Audio API 程序化生成环境音效，无需加载外部音频文件。
 * 支持：白噪音、棕噪音、粉噪音、以及混合场景音效。
 *
 * 设计理念：进入场景后自动以极低音量播放，营造"你在这里"的感觉。
 * 用户可以调节音量或关闭。
 */

export type AmbientPreset = 'library' | 'dormitory' | 'study-room' | 'cafe' | 'rain' | 'silence' | 'lake'

interface AmbientLayer {
  type: 'white' | 'brown' | 'pink'
  gain: number       // 该层的增益 (0-1)
}

// 每个场景的音效层配置
const PRESETS: Record<AmbientPreset, AmbientLayer[]> = {
  library: [
    { type: 'brown', gain: 0.3 },   // 深沉的背景噪音（类似空调/通风）
    { type: 'pink', gain: 0.08 },   // 轻微的沙沙声（类似翻书）
    { type: 'white', gain: 0.02 },  // 极轻的高频（类似远处低语）
  ],
  dormitory: [
    { type: 'brown', gain: 0.25 },  // 深沉的夜晚背景
    { type: 'pink', gain: 0.05 },   // 轻微的环境音
  ],
  'study-room': [
    { type: 'brown', gain: 0.2 },   // 安静的背景
    { type: 'white', gain: 0.01 },  // 极轻的环境
  ],
  cafe: [
    { type: 'brown', gain: 0.35 },  // 咖啡厅的低频嗡嗡声
    { type: 'pink', gain: 0.15 },   // 人声的模糊感
    { type: 'white', gain: 0.05 },  // 杯盘碰撞的高频
  ],
  rain: [
    { type: 'brown', gain: 0.4 },   // 雨声的低频部分
    { type: 'pink', gain: 0.2 },    // 雨声的中频部分
    { type: 'white', gain: 0.08 },  // 雨滴的高频部分
  ],
  lake: [
    { type: 'brown', gain: 0.2 },   // 湖水波动的低频
    { type: 'pink', gain: 0.1 },    // 湖水的中频
    { type: 'white', gain: 0.05 },  // 微风的高频
  ],
  silence: [],
}

export class AmbientSoundEngine {
  private audioCtx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private layers: { source: AudioBufferSourceNode; gain: GainNode }[] = []
  private _volume: number = 0.5
  private _muted: boolean = false
  private _playing: boolean = false
  private currentPreset: AmbientPreset | null = null

  get volume() { return this._volume }
  get muted() { return this._muted }
  get playing() { return this._playing }

  /**
   * 初始化音频上下文（需要用户交互后调用）
   */
  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext()
      this.masterGain = this.audioCtx.createGain()
      this.masterGain.connect(this.audioCtx.destination)
      this.applyVolume()
    }
    // 恢复被浏览器暂停的上下文
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume()
    }
    return this.audioCtx
  }

  /**
   * 生成噪音缓冲区
   */
  private createNoiseBuffer(type: 'white' | 'brown' | 'pink', duration: number = 4): AudioBuffer {
    const ctx = this.ensureContext()
    const sampleRate = ctx.sampleRate
    const length = sampleRate * duration
    const buffer = ctx.createBuffer(2, length, sampleRate)

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel)

      if (type === 'white') {
        // 白噪音：随机值
        for (let i = 0; i < length; i++) {
          data[i] = Math.random() * 2 - 1
        }
      } else if (type === 'brown') {
        // 棕噪音：累积随机（低频为主，类似海浪/风声）
        let lastOut = 0
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1
          data[i] = (lastOut + 0.02 * white) / 1.02
          lastOut = data[i]
          data[i] *= 3.5 // 增益补偿
        }
      } else if (type === 'pink') {
        // 粉噪音：1/f 频谱（介于白和棕之间，类似自然界的噪音）
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
        for (let i = 0; i < length; i++) {
          const white = Math.random() * 2 - 1
          b0 = 0.99886 * b0 + white * 0.0555179
          b1 = 0.99332 * b1 + white * 0.0750759
          b2 = 0.96900 * b2 + white * 0.1538520
          b3 = 0.86650 * b3 + white * 0.3104856
          b4 = 0.55000 * b4 + white * 0.5329522
          b5 = -0.7616 * b5 - white * 0.0168980
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
          b6 = white * 0.115926
        }
      }
    }

    return buffer
  }

  /**
   * 应用音量设置
   */
  private applyVolume() {
    if (this.masterGain) {
      const effectiveVolume = this._muted ? 0 : this._volume
      this.masterGain.gain.setTargetAtTime(
        effectiveVolume * 0.15, // 总体限制最大音量，保持背景感
        this.audioCtx!.currentTime,
        0.5 // 平滑过渡
      )
    }
  }

  /**
   * 停止所有音效层
   */
  private stopAllLayers() {
    for (const layer of this.layers) {
      try {
        layer.gain.gain.setTargetAtTime(0, this.audioCtx!.currentTime, 0.3)
        setTimeout(() => {
          try { layer.source.stop() } catch { /* already stopped */ }
        }, 1000)
      } catch { /* ignore */ }
    }
    this.layers = []
  }

  /**
   * 播放指定场景的环境音效
   */
  play(preset: AmbientPreset) {
    const config = PRESETS[preset]
    if (!config || config.length === 0) {
      this.stop()
      return
    }

    this.currentPreset = preset
    const ctx = this.ensureContext()

    // 如果已经在播放，先淡出再切换
    if (this._playing) {
      this.stopAllLayers()
    }

    // 创建新的音效层
    for (const layerConfig of config) {
      const buffer = this.createNoiseBuffer(layerConfig.type, 6) // 6秒循环
      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.loop = true

      const gain = ctx.createGain()
      gain.gain.value = 0 // 从0开始淡入
      gain.gain.setTargetAtTime(layerConfig.gain, ctx.currentTime, 1.0) // 1秒淡入

      source.connect(gain)
      gain.connect(this.masterGain!)
      source.start()

      this.layers.push({ source, gain })
    }

    this._playing = true
  }

  /**
   * 停止播放（淡出）
   */
  stop() {
    this.stopAllLayers()
    this._playing = false
    this.currentPreset = null
  }

  /**
   * 设置音量 (0-1)
   */
  setVolume(vol: number) {
    this._volume = Math.max(0, Math.min(1, vol))
    this.applyVolume()
  }

  /**
   * 静音/取消静音
   */
  setMuted(muted: boolean) {
    this._muted = muted
    this.applyVolume()
  }

  /**
   * 切换静音
   */
  toggleMute() {
    this.setMuted(!this._muted)
  }

  /**
   * 销毁引擎，释放资源
   */
  destroy() {
    this.stop()
    if (this.audioCtx) {
      this.audioCtx.close()
      this.audioCtx = null
      this.masterGain = null
    }
  }
}

// 全局单例
let engineInstance: AmbientSoundEngine | null = null

export function getAmbientEngine(): AmbientSoundEngine {
  if (!engineInstance) {
    engineInstance = new AmbientSoundEngine()
  }
  return engineInstance
}
