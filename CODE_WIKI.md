# 虚拟校园项目 Code Wiki

## 项目概览

虚拟校园是一个基于 Next.js 16 的自主学习平台，旨在帮助学生进行假期自主学习管理。项目采用现代化的前端技术栈，结合 Supabase 提供的后端服务，实现了一个功能丰富的学习管理系统。

**核心功能**：
- 每日学习规划与任务管理
- 番茄钟专注计时
- 校园场景打卡（图书馆、自习室、宿舍等）
- 学习数据统计与分析
- 目标设定与追踪
- 个人资料管理
- 主题切换

## 技术栈

| 类别 | 技术/库 | 版本 | 用途 |
|------|---------|------|------|
| 框架 | Next.js | 16.2.2 | 应用框架，提供路由、服务端渲染等功能 |
| 语言 | TypeScript | 5.x | 类型安全的 JavaScript 超集 |
| UI 库 | React | 19.2.4 | 前端 UI 构建 |
| 样式 | Tailwind CSS | 4.x | 实用优先的 CSS 框架 |
| UI 组件 | shadcn/ui | 4.1.2 | 可复用的 UI 组件库 |
| 图标 | lucide-react | 1.7.0 | 矢量图标库 |
| 图表 | recharts | 3.8.1 | 数据可视化图表 |
| 后端 | Supabase | 2.101.1 | 认证和数据库服务 |
| 工具库 | date-fns | 4.1.0 | 日期处理 |
| 通知 | sonner | 2.0.7 | 通知系统 |

## 项目架构

### 目录结构

```
├── src/
│   ├── app/                # Next.js 13+ App Router
│   │   ├── (auth)/         # 认证相关页面
│   │   ├── (main)/         # 主应用页面
│   │   │   ├── broadcasts/ # 广播页面
│   │   │   ├── campus/     # 校园页面（包含各场景）
│   │   │   ├── goals/      # 目标管理页面
│   │   │   ├── profile/    # 个人资料页面
│   │   │   ├── review/     # 回顾页面（日/周/月）
│   │   ├── api/            # API 路由
│   ├── components/         # 可复用组件
│   │   ├── ambient/        # 环境音效组件
│   │   ├── broadcast/      # 广播组件
│   │   ├── campus/         # 校园相关组件
│   │   ├── charts/         # 图表组件
│   │   ├── goals/          # 目标相关组件
│   │   ├── kanban/         # 看板组件
│   │   ├── navigation/     # 导航组件
│   │   ├── onboarding/     # 引导组件
│   │   ├── review/         # 回顾组件
│   │   ├── scene/          # 场景组件
│   │   ├── theme/          # 主题组件
│   │   ├── ui/             # 基础 UI 组件
│   ├── hooks/              # 自定义钩子
│   ├── lib/                # 工具库
│   │   ├── supabase/       # Supabase 配置
│   ├── styles/             # 样式文件
│   ├── types/              # TypeScript 类型定义
│   ├── middleware.ts       # 中间件
├── supabase/               # Supabase 迁移文件
├── package.json            # 项目依赖
├── next.config.ts          # Next.js 配置
├── tsconfig.json           # TypeScript 配置
```

### 核心模块

| 模块 | 路径 | 职责 |
|------|------|------|
| 看板系统 | `src/components/kanban/` | 任务管理、计划与实际对比、下一步指示 |
| 校园地图 | `src/components/campus/` | 校园场景展示、场景切换、路径规划 |
| 目标管理 | `src/components/goals/` | 目标设定、进度追踪、目标状态管理 |
| 数据可视化 | `src/components/charts/` | 学习时间图表、完成率图表、趋势分析 |
| 认证系统 | `src/app/(auth)/` | 用户登录、注册、身份验证 |
| API 服务 | `src/app/api/` | 后端 API 接口，与 Supabase 交互 |
| 主题系统 | `src/components/theme/` | 主题切换、样式管理 |

## 关键组件与函数

### 1. 看板系统 (KanbanBoard)

**路径**：`src/components/kanban/KanbanBoard.tsx`

**功能**：
- 展示每日任务列表
- 计划与实际学习时间对比
- 下一步行动指示
- 目标进度卡片
- 学习趋势图表

**核心函数**：
- `fetchData()` - 获取看板数据，包括任务、计划、场景状态等
- `handleLeaveScene()` - 处理离开场景的逻辑，计算学习时长
- `getGreeting()` - 根据时间生成问候语

**关键类型**：
```typescript
interface KanbanData {
  has_plan: boolean
  plan: Record<string, unknown> | null
  tasks: TaskItem[]
  active_scene: { scene: string; scene_name: string; checkin_id: string; started_at: string } | null
  today_checkins: Array<{ id: string; scene: string; scene_name: string; check_in_at: string; check_out_at: string | null; duration_minutes: number | null }>
  today_points: number
  plan_vs_actual: { planned_minutes: number; actual_minutes: number; deviation_rate: number; completion_rate: number; accuracy_avg: number }
  todo_items: { has_daily_review: boolean; has_sleep_log: boolean; streak_days: number }
  unread_broadcasts: number
  yesterday_plan: Record<string, unknown> | null
  has_monthly_goal: boolean
  has_weekly_goal: boolean
}
```

### 2. 校园地图 (CampusMap)

**路径**：`src/components/campus/CampusMap.tsx`

**功能**：
- 展示校园建筑（图书馆、自习室、宿舍、考试中心）
- 场景切换与解锁状态管理
- 时间周期变化效果（白天、傍晚、夜晚、深夜）
- 路径可视化与推荐路径

**核心函数**：
- `handleClick()` - 处理建筑点击事件，检查解锁状态
- `getPathD()` - 计算建筑之间的路径
- `getRedForPeriod()` - 根据时间周期获取红色调
- `getBackgroundForPeriod()` - 根据时间周期获取背景色

**关键类型**：
```typescript
interface BuildingDef {
  id: string
  name: string
  x: number
  y: number
  width: number
  height: number
}

type TimePeriod = 'daytime' | 'evening' | 'night' | 'late-night'
```

### 3. 主题系统

**路径**：`src/components/ThemeProvider.tsx`

**功能**：
- 主题切换与管理
- 本地存储主题偏好
- 主题初始化与应用

**支持的主题**：
- journal - 日记主题
- pixel - 像素主题
- zen - 禅意主题
- magazine - 杂志主题
- star-citizen - 星际公民主题
- mirrors-edge - 镜之边缘主题

### 4. API 接口

**主要 API 路由**：

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/kanban` | GET | 获取看板数据 |
| `/api/scene` | POST | 场景打卡 |
| `/api/scene` | PUT | 离开场景 |
| `/api/goals` | GET | 获取目标列表 |
| `/api/goals/progress` | GET | 获取目标进度 |
| `/api/tasks` | GET | 获取任务列表 |
| `/api/tasks` | POST | 创建任务 |
| `/api/tasks` | PUT | 更新任务 |
| `/api/reviews` | GET | 获取回顾数据 |
| `/api/pomodoro` | POST | 番茄钟记录 |

### 5. 认证系统

**路径**：`src/lib/supabase/`

**功能**：
- 用户登录/注册
- JWT 令牌管理
- 会话维护
- 权限控制

**核心文件**：
- `client.ts` - 客户端 Supabase 实例
- `server.ts` - 服务端 Supabase 实例
- `middleware.ts` - 认证中间件

## 数据模型

### 主要数据表

1. **profiles** - 用户资料
   - id: UUID (主键)
   - nickname: 字符串
   - created_at: 时间戳

2. **plans** - 学习计划
   - id: UUID (主键)
   - user_id: UUID (外键)
   - date: 日期
   - total_minutes: 整数
   - created_at: 时间戳

3. **tasks** - 学习任务
   - id: UUID (主键)
   - plan_id: UUID (外键)
   - task_index: 整数
   - task_type: 字符串
   - subject: 字符串
   - topic: 字符串
   - estimated_minutes: 整数
   - status: 字符串
   - actual_minutes: 整数
   - accuracy_rate: 浮点数
   - points_earned: 整数

4. **scenes** - 场景打卡
   - id: UUID (主键)
   - user_id: UUID (外键)
   - scene: 字符串
   - scene_name: 字符串
   - check_in_at: 时间戳
   - check_out_at: 时间戳
   - duration_minutes: 整数

5. **goals** - 学习目标
   - id: UUID (主键)
   - user_id: UUID (外键)
   - period: 字符串 (monthly/weekly)
   - title: 字符串
   - total_units: 整数
   - completed_units: 整数
   - start_date: 日期
   - target_date: 日期
   - status: 字符串

6. **broadcasts** - 广播消息
   - id: UUID (主键)
   - title: 字符串
   - content: 字符串
   - is_active: 布尔值
   - created_at: 时间戳

## 项目运行方式

### 开发环境

1. **安装依赖**
   ```bash
   npm install
   # 或
   yarn install
   # 或
   pnpm install
   ```

2. **启动开发服务器**
   ```bash
   npm run dev
   # 或
   yarn dev
   # 或
   pnpm dev
   ```

3. **访问应用**
   打开浏览器访问 `http://localhost:3000`

### 生产环境

1. **构建项目**
   ```bash
   npm run build
   # 或
   yarn build
   # 或
   pnpm build
   ```

2. **启动生产服务器**
   ```bash
   npm start
   # 或
   yarn start
   # 或
   pnpm start
   ```

### 部署

项目推荐部署在 Vercel 平台，步骤如下：

1. 登录 Vercel 账号
2. 导入项目仓库
3. 配置环境变量（主要是 Supabase 相关配置）
4. 部署项目

## 关键功能流程

### 1. 每日规划流程

1. 用户进入宿舍页面 (`/campus/dormitory`)
2. 创建当日学习计划，设置总学习时间
3. 添加具体学习任务，包括科目、主题和预计时长
4. 保存计划后，系统生成任务列表
5. 用户可以在看板页面查看和管理任务

### 2. 场景打卡流程

1. 用户进入校园页面 (`/campus`)
2. 选择解锁的场景（如图书馆、自习室）
3. 系统记录打卡时间
4. 用户在场景中学习，系统自动计时
5. 用户离开场景时，系统计算学习时长并更新任务进度

### 3. 目标管理流程

1. 用户进入目标页面 (`/goals`)
2. 创建月度或周度学习目标
3. 系统定期更新目标进度
4. 用户可以在看板页面查看目标完成情况
5. 目标完成后，系统发放奖励积分

### 4. 数据统计与分析

1. 系统自动收集用户学习数据
2. 在看板页面展示计划与实际学习时间对比
3. 提供学习趋势图表，展示学习习惯
4. 生成每日、每周、每月回顾报告

## 主题系统

项目支持多种主题，每种主题都有独特的视觉风格：

| 主题 | 风格 | 特点 |
|------|------|------|
| journal | 日记风格 | 简洁、优雅，适合日常使用 |
| pixel | 像素风格 | 复古游戏风格，趣味性强 |
| zen | 禅意风格 | 简约、宁静，适合专注学习 |
| magazine | 杂志风格 | 现代、时尚，信息展示清晰 |
| star-citizen | 科幻风格 | 未来感、科技感，视觉冲击力强 |
| mirrors-edge | 镜之边缘风格 | 几何、锐利，线条感强 |

## 项目亮点

1. **沉浸式学习环境** - 通过场景切换和环境音效，营造专注的学习氛围
2. **智能任务管理** - 基于看板系统的任务管理，帮助用户有效规划学习时间
3. **数据驱动决策** - 详细的学习数据统计和分析，帮助用户了解学习习惯
4. **个性化主题** - 多种视觉主题，满足不同用户的审美需求
5. **移动友好** - 响应式设计，支持在各种设备上使用
6. **实时反馈** - 即时的任务完成反馈和积分奖励，增强学习动力

## 未来发展方向

1. **多人协作** - 支持学习小组功能，共同完成学习目标
2. **AI 辅助** - 基于学习数据的智能推荐和学习路径规划
3. **扩展场景** - 增加更多学习场景，如实验室、操场等
4. **社交功能** - 添加学习社区，分享学习心得和资源
5. **跨平台支持** - 开发移动端应用，实现多端数据同步

## 常见问题与解决方案

### 1. 场景打卡失败

**问题**：用户无法正常打卡进入场景

**解决方案**：
- 检查网络连接
- 确保已完成当日学习计划（部分场景需要完成计划才能解锁）
- 清除浏览器缓存后重试

### 2. 数据不同步

**问题**：学习数据没有正确同步到服务器

**解决方案**：
- 检查网络连接
- 尝试刷新页面
- 确认用户已登录

### 3. 主题切换不生效

**问题**：切换主题后页面样式没有变化

**解决方案**：
- 清除浏览器缓存
- 刷新页面
- 检查浏览器控制台是否有错误信息

### 4. 任务无法完成

**问题**：用户完成任务后状态没有更新

**解决方案**：
- 确保用户已离开学习场景
- 检查网络连接
- 尝试刷新页面

## 总结

虚拟校园项目是一个功能丰富、设计现代的自主学习平台，通过游戏化的方式激励学生进行有效的学习管理。项目采用了先进的前端技术栈，结合 Supabase 提供的后端服务，实现了一个完整的学习管理系统。

项目的核心价值在于：
- 帮助学生建立良好的学习习惯
- 提供可视化的学习数据，促进自我反思
- 通过游戏化元素增强学习动力
- 创造沉浸式的学习环境，提高学习效率

虚拟校园不仅是一个学习工具，更是一个培养自律和时间管理能力的平台，适合各类学生使用。