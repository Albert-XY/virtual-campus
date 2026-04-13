# 虚拟校园引导系统规划

## 问题分析

### 当前痛点
1. **上手门槛高**：新用户不知道从哪里开始
2. **流程不清晰**：各个场景的使用顺序和目的不明确
3. **功能发现困难**：很多功能需要用户主动探索才能发现
4. **缺乏引导**：没有系统化的教程来指导用户体验完整流程

### 核心需求
- 创建一个完整的引导系统，从第一次登录开始
- 提供虚拟任务，带领用户体验所有核心功能
- 构建教程体系，帮助用户理解每个场景的用途
- 建立循序渐进的学习路径

## 解决方案设计

### 1. 新手引导流程

#### 1.1 第一次登录引导
```
欢迎来到虚拟校园！

这不是一个普通的工具，而是一个让你"生活"在学习中的地方。
让我们开始你的第一天：

第一步：在宿舍规划今天要做什么
第二步：去图书馆探索知识
第三步：到自习室专注练习
第四步：来海神湖放松一下
第五步：回到宿舍总结一天

准备好了吗？
```

#### 1.2 引导系统架构
```
src/
├── components/
│   ├── onboarding/
│   │   ├── WelcomeScreen.tsx          # 欢迎屏幕
│   │   ├── TutorialOverlay.tsx        # 教程覆盖层
│   │   ├── VirtualTaskManager.tsx     # 虚拟任务管理器
│   │   ├── GuideDialog.tsx            # 引导对话框
│   │   └── ProgressIndicator.tsx      # 进度指示器
│   ├── guide/
│   │   ├── TooltipGuide.tsx           # 工具提示引导
│   │   ├── HighlightGuide.tsx         # 高亮引导
│   │   └── Walkthrough.tsx            # 完整教程
```

### 2. 虚拟任务系统

#### 2.1 第一天的虚拟任务

| 序号 | 任务名称 | 地点 | 目标 | 奖励 |
|------|----------|------|------|------|
| 1 | 规划今天的学习 | 宿舍 | 创建第一个学习计划 | +10 积分 |
| 2 | 探索知识殿堂 | 图书馆 | 进入图书馆场景 | +5 积分 |
| 3 | 开始专注学习 | 自习室 | 专注15分钟 | +15 积分 |
| 4 | 给自己一个休息 | 海神湖 | 尝试呼吸引导 | +5 积分 |
| 5 | 回顾这一天 | 宿舍 | 完成日总结 | +10 积分 |

**完成所有任务**：解锁"第一天"徽章，+50 积分

#### 2.2 任务数据结构
```typescript
interface VirtualTask {
  id: string
  title: string
  description: string
  location: string
  locationName: string
  objective: string
  reward: number
  order: number
  isCompleted: boolean
  isActive: boolean
  prerequisites?: string[]  // 前置任务
}

interface TutorialStep {
  id: string
  title: string
  content: string
  type: 'info' | 'action' | 'highlight'
  target?: string  // DOM selector for highlighting
  taskId?: string  // 关联的任务
}
```

### 3. 教程系统

#### 3.1 场景特定教程

每个场景都有自己的教程，引导用户了解该场景的功能：

**宿舍场景教程**：
1. 了解宿舍的作用 - 一天的起点和终点
2. 如何创建学习计划
3. 如何进行日总结
4. 睡眠打卡的重要性

**图书馆场景教程**：
1. 图书馆的用途 - 知识探索
2. 如何开始专注学习
3. 番茄钟的使用
4. 环境音效的控制

**自习室场景教程**：
1. 自习室的用途 - 练习和应用
2. 任务管理
3. 学习数据查看

**海神湖场景教程**：
1. 海神湖的用途 - 休息和放松
2. 呼吸引导的正确方法
3. 身体扫描的作用
4. 发呆模式的好处

#### 3.2 教程交互模式
- **高亮模式**：高亮显示特定元素，配合文字说明
- **工具提示**：悬停或点击时显示详细说明
- **分步引导**：一步一步指导用户完成操作
- **演示模式**：自动演示功能的使用方法

### 4. 技术实现方案

#### 4.1 状态管理
```typescript
interface OnboardingState {
  isFirstTime: boolean
  currentStep: number
  completedTasks: string[]
  completedTutorials: string[]
  currentTask: VirtualTask | null
  tutorialProgress: Record<string, number>  // 场景 -> 进度
  hasSeenWelcome: boolean
}
```

#### 4.2 本地存储
使用 localStorage 保存用户的引导进度：
```javascript
// 存储键
const ONBOARDING_KEY = 'virtual-campus-onboarding'
const TASKS_KEY = 'virtual-campus-tasks'
const TUTORIALS_KEY = 'virtual-campus-tutorials'

// 数据结构
interface StoredData {
  onboarding: OnboardingState
  tasks: VirtualTask[]
  tutorials: Record<string, boolean>  // 教程ID -> 是否已完成
}
```

#### 4.3 组件设计

**WelcomeScreen 组件**：
- 欢迎动画
- 项目理念介绍
- 开始按钮
- 跳过选项（允许用户直接进入）

**VirtualTaskManager 组件**：
- 任务列表显示
- 当前任务高亮
- 完成状态指示
- 进度条
- 奖励展示

**TutorialOverlay 组件**：
- 半透明覆盖层
- 高亮区域
- 教程内容展示
- 前进/后退/跳过按钮
- 完成确认

### 5. 实施计划

#### 阶段一：基础引导系统（P0）
1. 创建 `OnboardingProvider` 状态管理
2. 实现欢迎屏幕组件
3. 构建虚拟任务系统核心
4. 实现任务完成检测

#### 阶段二：教程系统（P1）
1. 创建教程覆盖层组件
2. 实现高亮和工具提示功能
3. 为每个场景创建基础教程
4. 添加教程进度保存

#### 阶段三：增强功能（P2）
1. 实现分步引导
2. 添加演示模式
3. 创建成就系统
4. 添加重新开始教程的选项

### 6. 用户体验设计

#### 6.1 引导原则
- **不干扰**：引导不应成为用户使用的障碍
- **可跳过**：用户随时可以跳过引导
- **可重看**：用户可以随时重新查看教程
- **渐进式**：引导随用户使用逐步深入

#### 6.2 视觉设计
- **柔和色彩**：使用与主题协调的颜色
- **清晰字体**：确保文字易于阅读
- **适当动画**：平滑的过渡和高亮效果
- **响应式**：在各种设备上都有良好体验

### 7. 示例教程流程

#### 完整的第一天流程
```
1. 登录后显示欢迎屏幕
   ├─ 介绍虚拟校园的理念
   └─ 点击"开始探索"

2. 进入宿舍场景
   ├─ 高亮显示"规划"按钮
   ├─ 弹出教程："这是宿舍，先规划今天要做什么"
   └─ 引导完成第一个学习计划

3. 显示虚拟任务更新
   ├─ "任务1完成！+10积分"
   └─ "下一个任务：去图书馆探索知识"

4. 校园地图
   ├─ 高亮显示图书馆建筑
   ├─ "点击图书馆进入"
   └─ 切换到图书馆场景

5. 图书馆场景
   ├─ 介绍图书馆功能
   ├─ 引导开始番茄钟
   └─ 任务2完成提示

6. 继续引导到自习室、海神湖、宿舍总结
   └─ 完成所有任务后解锁"第一天"徽章
```

## 总结

通过构建这个引导系统，我们可以：
- 降低新用户的上手门槛
- 帮助用户理解每个场景的用途
- 引导用户体验完整的学习流程
- 增加用户的参与度和留存率
- 让虚拟校园的理念更好地传达给用户

这个系统将与现有的虚拟校园功能完美结合，创造一个完整、友好的用户体验。