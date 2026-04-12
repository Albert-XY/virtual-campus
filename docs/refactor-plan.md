# 虚拟校园自主学习平台 -- 全面重构实施计划

> 版本：v1.0
> 日期：2026-04-12
> 目标：从"多页面功能列表"重构为"看板驱动的线上学校操作系统"

---

## 目录

1. [重构总览](#1-重构总览)
2. [现有项目结构分析](#2-现有项目结构分析)
3. [子系统1：看板主界面](#3-子系统1看板主界面核心)
4. [子系统2：播报系统](#4-子系统2播报系统)
5. [子系统3：场景面板化](#5-子系统3场景面板化)
6. [子系统4：数据可视化](#6-子系统4数据可视化)
7. [子系统5：结构化复盘](#7-子系统5结构化复盘)
8. [子系统6：导航重构](#8-子系统6导航重构)
9. [文件变更总清单](#9-文件变更总清单)
10. [执行顺序与依赖关系](#10-执行顺序与依赖关系)
11. [风险点与应对方案](#11-风险点与应对方案)

---

## 1. 重构总览

### 1.1 重构目标

将虚拟校园自主学习平台从当前的"多页面功能列表"模式（17个页面、底部5个Tab导航、页面间频繁跳转）重构为"看板驱动的线上学校操作系统"模式：

- **看板即主界面**：用户打开App即看到"我作为学习者"的全景视图，所有关键信息一目了然
- **减少页面跳转**：核心操作在看板上直接完成，场景以面板形式展开
- **播报创造集体感**：学校广播强制弹窗，营造真实校园氛围
- **数据驱动决策**：趋势图帮助用户理解自己的学习模式
- **结构化复盘**：引导式思考替代自由textarea，提升复盘质量

### 1.2 架构变化

| 维度 | 重构前 | 重构后 |
|------|--------|--------|
| 主页面 | `/today`（今日页） | `/`（看板主页） |
| 导航方式 | 底部5个Tab（今日/校园/规划/积分/我的） | 看板单页面 + 顶部栏 + 侧边栏抽屉 |
| 场景交互 | 独立页面（`/campus/library`、`/campus/study-room`） | 看板内展开面板（Sheet/Drawer） |
| 复盘方式 | 自由textarea | 引导式结构化模板 |
| 数据展示 | 纯数字/文字 | recharts趋势图 |
| 校园通知 | 无 | 播报系统（强制弹窗 + 存档） |

### 1.3 技术方案

- **前端框架**：Next.js 16 + React 19（保持不变）
- **UI组件库**：shadcn/ui（保持不变，新增 Sheet 组件用于面板）
- **图表库**：recharts（已安装，新增使用）
- **样式方案**：Tailwind CSS v4 + CSS变量主题系统（保持不变）
- **数据库**：Supabase PostgreSQL（新增 broadcasts 表）
- **新增依赖**：无需额外安装（recharts 已存在，Sheet 组件通过 shadcn CLI 添加）

---

## 2. 现有项目结构分析

### 2.1 文件清单

#### 页面（17个）

| 文件路径 | 用途 |
|---------|------|
| `src/app/page.tsx` | 首页（登录前Landing Page，已登录则redirect到`/today`） |
| `src/app/(auth)/layout.tsx` | 认证布局 |
| `src/app/(auth)/login/page.tsx` | 登录页 |
| `src/app/(auth)/register/page.tsx` | 注册页 |
| `src/app/(main)/layout.tsx` | 主布局（含顶部栏 + BottomNav） |
| `src/app/(main)/page.tsx` | 主页入口（redirect到`/today`） |
| `src/app/(main)/today/page.tsx` | 今日页（当前核心页面） |
| `src/app/(main)/campus/page.tsx` | 校园场景选择页 |
| `src/app/(main)/campus/library/page.tsx` | 图书馆（知识学习场景） |
| `src/app/(main)/campus/study-room/page.tsx` | 自习室（练习巩固场景） |
| `src/app/(main)/campus/dormitory/page.tsx` | 宿舍（睡眠打卡场景） |
| `src/app/(main)/dashboard/page.tsx` | 规划中心（日/周/月规划 + 总结Tab） |
| `src/app/(main)/review/daily/page.tsx` | 日总结页 |
| `src/app/(main)/review/weekly/page.tsx` | 周总结页 |
| `src/app/(main)/review/monthly/page.tsx` | 月总结页 |
| `src/app/(main)/profile/page.tsx` | 个人主页 |
| `src/app/(main)/profile/points/page.tsx` | 积分详情页 |
| `src/app/(main)/profile/appearance/page.tsx` | 外观设置页 |
| `src/app/(main)/profile/settings/page.tsx` | 个人设置页 |

#### 业务组件（12个）

| 文件路径 | 用途 |
|---------|------|
| `src/components/BottomNav.tsx` | 底部5Tab导航 |
| `src/components/PlanForm.tsx` | 规划表单（创建/编辑日计划） |
| `src/components/PlanSummary.tsx` | 规划摘要展示 |
| `src/components/PomodoroTimer.tsx` | 番茄钟组件 |
| `src/components/SummaryTab.tsx` | 总结Tab（日/周/月总结入口） |
| `src/components/WeekPlanTab.tsx` | 周规划Tab |
| `src/components/MonthPlanTab.tsx` | 月规划Tab |
| `src/components/GuideOverlay.tsx` | 引导覆盖层 |
| `src/components/GuideProvider.tsx` | 引导上下文提供者 |
| `src/components/ProtectedRoute.tsx` | 路由守卫 |
| `src/components/ThemeProvider.tsx` | 主题提供者 |
| `src/components/ThemeInitializer.tsx` | 主题初始化 |

#### API路由（12个）

| 文件路径 | 用途 |
|---------|------|
| `src/app/api/plan/route.ts` | 日计划CRUD |
| `src/app/api/plan/check/route.ts` | 检查是否有今日计划 |
| `src/app/api/tasks/route.ts` | 任务CRUD + 状态变更 |
| `src/app/api/scene/route.ts` | 场景签到/签退 |
| `src/app/api/pomodoro/route.ts` | 番茄钟会话管理 |
| `src/app/api/sleep/route.ts` | 睡眠打卡 |
| `src/app/api/points/route.ts` | 积分查询 |
| `src/app/api/profile/route.ts` | 用户资料 |
| `src/app/api/reviews/route.ts` | 总结CRUD |
| `src/app/api/today/route.ts` | 今日聚合数据 |
| `src/app/api/weekly-plan/route.ts` | 周计划 |
| `src/app/api/monthly-plan/route.ts` | 月计划 |

#### Lib文件（7个）

| 文件路径 | 用途 |
|---------|------|
| `src/lib/supabase/client.ts` | Supabase客户端 |
| `src/lib/supabase/server.ts` | Supabase服务端 |
| `src/lib/supabase/middleware.ts` | Supabase中间件 |
| `src/lib/points.ts` | 积分计算工具 |
| `src/lib/themes.ts` | 主题配置 |
| `src/lib/guide.ts` | 引导配置 |
| `src/lib/utils.ts` | 通用工具 |

#### 数据库（7张表 + 5个触发器）

| 表名 | 用途 |
|------|------|
| `profiles` | 用户资料 + 总积分 |
| `daily_plans` | 每日计划（学习区间 + 休息区间 + 任务列表） |
| `scene_checkins` | 场景签到记录 |
| `pomodoro_sessions` | 番茄钟会话 |
| `points_logs` | 积分日志 |
| `tasks` | 任务表（独立于daily_plans.tasks JSONB） |
| `sleep_logs` | 睡眠记录 |

### 2.2 现有代码量

- 总计约 14,130 行代码
- 最大文件：`src/app/(main)/campus/library/page.tsx`（648行）、`src/app/(main)/campus/study-room/page.tsx`（652行）
- 核心业务逻辑集中在页面组件中，组件复用度较低

---

## 3. 子系统1：看板主界面（核心）

### 3.1 目标

将 `/` 从当前的 redirect 页面改造为看板主页，替代现有的 `/today` 页面。看板是用户登录后看到的唯一主界面，包含所有核心信息。

### 3.2 看板布局设计

```
+------------------------------------------+
|  [顶部栏] 虚拟校园    积分  铃铛  菜单   |
+------------------------------------------+
|                                          |
|  [问候区] 早上好，同学                    |
|           2026年4月12日 星期日             |
|                                          |
|  [快速规划] (无计划时显示)                 |
|  +--------+  +--------+                  |
|  | 快速   |  | 详细   |                  |
|  | 规划   |  | 规划   |                  |
|  +--------+  +--------+                  |
|                                          |
|  [今日任务列表] (有计划时显示)             |
|  +--------------------------------------+|
|  | 任务1  数学-二次函数  30min  [开始]   ||
|  | 任务2  英语-阅读理解  45min  [待完成] ||
|  | 任务3  物理-力学    30min  [已完成]   ||
|  +--------------------------------------+|
|  进度: 1/3 (33%)                         |
|                                          |
|  [计划vs实际对比]                         |
|  +--------------------------------------+|
|  | 规划时长: 240min  实际: 180min        ||
|  | 偏差率: 25%                           ||
|  +--------------------------------------+|
|                                          |
|  [学习数据趋势] (可折叠)                  |
|  +--------------------------------------+|
|  | [偏差率趋势图]                         ||
|  | [学习时长趋势图]                       ||
|  | [准确率趋势图]                         ||
|  +--------------------------------------+|
|                                          |
|  [待办事项]                               |
|  +--------------------------------------+|
|  | 日总结  [未完成]  去总结 >             ||
|  | 睡眠打卡  [待打卡]  去打卡 >           ||
|  +--------------------------------------+|
|                                          |
|  [场景快捷入口]                           |
|  +--------+  +--------+  +--------+     |
|  | 图书馆 |  | 自习室 |  | 宿舍   |     |
|  +--------+  +--------+  +--------+     |
|                                          |
+------------------------------------------+
```

### 3.3 任务分解

#### 任务 1.1：创建看板主页面

- **操作**：修改文件
- **文件**：`src/app/(main)/page.tsx`
- **改动**：
  - 删除当前的 `redirect('/today')` 逻辑
  - 替换为完整的看板组件（`KanbanBoard`）
  - 看板组件聚合所有数据：今日任务、执行记录、计划vs实际、待办事项、趋势图
- **依赖**：任务 1.2（看板子组件）、任务 1.3（API聚合）、任务 6.1（顶部栏改造）
- **复杂度**：大

#### 任务 1.2：创建看板子组件

- **操作**：新建文件
- **文件**：
  - `src/components/kanban/TaskList.tsx` -- 今日任务列表（支持内联编辑、点击展开场景面板）
  - `src/components/kanban/PlanVsActual.tsx` -- 计划vs实际对比卡片
  - `src/components/kanban/TodoSection.tsx` -- 待办事项区（总结/考试/睡眠打卡）
  - `src/components/kanban/SceneShortcuts.tsx` -- 场景快捷入口（图书馆/自习室/宿舍）
  - `src/components/kanban/QuickPlan.tsx` -- 快速规划区（无计划时显示）
  - `src/components/kanban/KanbanBoard.tsx` -- 看板主容器组件（组合上述子组件）
- **改动**：
  - `TaskList.tsx`：从现有 `today/page.tsx` 的任务列表部分提取并增强，支持内联编辑任务状态、点击任务展开场景执行面板
  - `PlanVsActual.tsx`：展示规划时长vs实际时长、偏差率、任务完成率
  - `TodoSection.tsx`：聚合日总结状态、睡眠打卡状态等待办事项
  - `SceneShortcuts.tsx`：底部场景快捷入口，点击触发场景面板
  - `QuickPlan.tsx`：从现有 `today/page.tsx` 的无计划状态提取
  - `KanbanBoard.tsx`：组合所有子组件，管理数据获取和状态
- **依赖**：任务 3.1（场景面板组件）、任务 4.1（趋势图组件）
- **复杂度**：大

#### 任务 1.3：创建看板聚合API

- **操作**：修改文件
- **文件**：`src/app/api/today/route.ts`
- **改动**：
  - 扩展现有 `/api/today` 接口，增加返回字段：
    - `plan_vs_actual`：计划时长 vs 实际时长对比
    - `deviation_rate`：偏差率
    - `accuracy_avg`：平均准确率
    - `trend_data`：最近7天/30天的趋势数据（偏差率、学习时长、准确率、完成率）
    - `todo_items`：待办事项列表（日总结状态、睡眠打卡状态）
  - 或者新建 `src/app/api/kanban/route.ts` 作为看板专用API，避免修改现有接口
- **依赖**：无
- **复杂度**：中

#### 任务 1.4：看板内联任务编辑

- **操作**：修改文件
- **文件**：`src/components/kanban/TaskList.tsx`
- **改动**：
  - 任务卡片支持直接点击"开始"/"完成"按钮（复用现有 `/api/tasks` 的 start/complete action）
  - 点击任务卡片展开场景执行面板（不跳转页面）
  - 完成任务时弹出内联表单（实际用时 + 准确率），复用现有 Dialog 逻辑
- **依赖**：任务 1.2、任务 3.1
- **复杂度**：中

#### 任务 1.5：废弃旧今日页

- **操作**：删除文件
- **文件**：`src/app/(main)/today/page.tsx`
- **改动**：
  - 删除该文件（功能已迁移到看板主页）
  - 更新所有指向 `/today` 的链接和 redirect
- **依赖**：任务 1.1
- **复杂度**：小

---

## 4. 子系统2：播报系统

### 4.1 目标

新建播报系统，允许管理员发布校园广播（视频/图文），用户打开App时强制弹窗显示未读播报，创造集体感。

### 4.2 数据库设计

```sql
-- 播报表
create table public.broadcasts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  content_type text not null default 'text',  -- 'text' | 'image' | 'video'
  content text not null default '',            -- 文字内容（Markdown）
  media_url text,                               -- 图片/视频URL
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz                        -- 过期时间（可选）
);

-- 播报已读记录
create table public.broadcast_views (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  broadcast_id uuid not null references public.broadcasts(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  unique(user_id, broadcast_id)
);
```

### 4.3 任务分解

#### 任务 2.1：创建播报数据库迁移

- **操作**：新建文件
- **文件**：`supabase/migration-003-broadcasts.sql`
- **改动**：
  - 创建 `broadcasts` 表（含RLS策略）
  - 创建 `broadcast_views` 表（含RLS策略）
  - RLS策略：所有用户可读播报，仅管理员可创建/发布
- **依赖**：无
- **复杂度**：小

#### 任务 2.2：添加播报类型定义

- **操作**：修改文件
- **文件**：`src/types/index.ts`
- **改动**：
  - 新增 `Broadcast` 接口（id, title, content_type, content, media_url, is_published, published_at, created_by, created_at, expires_at）
  - 新增 `BroadcastView` 接口（id, user_id, broadcast_id, viewed_at）
- **依赖**：无
- **复杂度**：小

#### 任务 2.3：创建播报管理API

- **操作**：新建文件
- **文件**：`src/app/api/broadcasts/route.ts`
- **改动**：
  - `GET`：获取播报列表（支持分页、过滤已发布）
  - `POST`：创建播报（仅管理员）
  - `PUT`：发布/取消发布播报（仅管理员）
- **依赖**：任务 2.1、任务 2.2
- **复杂度**：中

#### 任务 2.4：创建播报客户端API

- **操作**：新建文件
- **文件**：`src/app/api/broadcasts/view/route.ts`
- **改动**：
  - `GET`：获取当前用户待查看的播报（未读且已发布的播报）
  - `POST`：标记播报为已读（记录到 broadcast_views）
- **依赖**：任务 2.1、任务 2.2
- **复杂度**：小

#### 任务 2.5：创建播报弹窗组件

- **操作**：新建文件
- **文件**：`src/components/broadcast/BroadcastPopup.tsx`
- **改动**：
  - 全屏弹窗组件，在看板主页加载时检查未读播报
  - 支持三种内容类型：纯文字（Markdown渲染）、图文、视频
  - 用户必须关闭弹窗才能继续操作（强制显示）
  - 关闭时自动标记为已读
  - 支持多条播报依次显示（轮播）
- **依赖**：任务 2.4、任务 6.1（顶部栏铃铛集成）
- **复杂度**：大

#### 任务 2.6：创建播报存档页面

- **操作**：新建文件
- **文件**：`src/app/(main)/broadcasts/page.tsx`
- **改动**：
  - 播报历史列表页，按时间倒序展示
  - 支持查看播报详情（文字/图片/视频）
  - 从侧边栏导航进入
- **依赖**：任务 2.3
- **复杂度**：中

---

## 5. 子系统3：场景面板化

### 5.1 目标

将图书馆和自习室从独立页面改为可展开的面板组件（Sheet/Drawer），在看板内直接展开执行任务，无需跳转页面。宿舍保持独立页面（睡眠打卡流程特殊）。

### 5.2 任务分解

#### 任务 5.1：添加 shadcn Sheet 组件

- **操作**：新建文件
- **文件**：`src/components/ui/sheet.tsx`
- **改动**：
  - 通过 `npx shadcn@latest add sheet` 添加 Sheet 组件
  - Sheet 组件用于从底部滑出或从右侧展开的面板
- **依赖**：无
- **复杂度**：小

#### 任务 5.2：创建场景面板通用容器

- **操作**：新建文件
- **文件**：`src/components/scene/ScenePanel.tsx`
- **改动**：
  - 基于 Sheet 组件封装场景面板容器
  - 面板从底部滑出（移动端友好）
  - 包含：场景标题、任务列表、番茄钟、离开按钮
  - 接收 `scene` prop（'library' | 'study-room'）和 `taskId` prop
  - 自动处理场景签到/签退逻辑
  - 面板关闭时自动签退
- **依赖**：任务 5.1
- **复杂度**：大

#### 任务 5.3：提取图书馆场景面板内容

- **操作**：新建文件
- **文件**：`src/components/scene/LibraryPanel.tsx`
- **改动**：
  - 从 `src/app/(main)/campus/library/page.tsx` 提取核心逻辑
  - 包含：任务列表、开始/完成任务、番茄钟、完成弹窗
  - 适配面板布局（去除顶部导航栏、调整间距）
  - 复用现有 `PomodoroTimer` 组件
- **依赖**：任务 5.2
- **复杂度**：中

#### 任务 5.4：提取自习室场景面板内容

- **操作**：新建文件
- **文件**：`src/components/scene/StudyRoomPanel.tsx`
- **改动**：
  - 从 `src/app/(main)/campus/study-room/page.tsx` 提取核心逻辑
  - 包含：任务列表、开始/完成任务、番茄钟、完成弹窗
  - 适配面板布局
  - 复用现有 `PomodoroTimer` 组件
- **依赖**：任务 5.2
- **复杂度**：中

#### 任务 5.5：集成场景面板到看板

- **操作**：修改文件
- **文件**：`src/components/kanban/TaskList.tsx`、`src/components/kanban/SceneShortcuts.tsx`
- **改动**：
  - `TaskList.tsx`：点击任务卡片时，根据任务类型展开对应场景面板（knowledge -> 图书馆面板，practice -> 自习室面板）
  - `SceneShortcuts.tsx`：点击场景快捷入口时展开对应面板
- **依赖**：任务 5.3、任务 5.4、任务 1.2
- **复杂度**：中

#### 任务 5.6：废弃旧场景页面

- **操作**：删除文件
- **文件**：
  - `src/app/(main)/campus/library/page.tsx`
  - `src/app/(main)/campus/study-room/page.tsx`
  - `src/app/(main)/campus/page.tsx`
- **改动**：
  - 删除图书馆和自习室独立页面（功能已迁移到面板）
  - 删除校园场景选择页（功能已迁移到看板底部快捷入口）
  - 保留宿舍页面 `src/app/(main)/campus/dormitory/page.tsx`
- **依赖**：任务 5.5
- **复杂度**：小

---

## 6. 子系统4：数据可视化

### 6.1 目标

使用 recharts 库在看板中展示学习数据趋势图，帮助用户直观了解自己的学习模式。

### 6.2 图表规格

| 图表 | 数据源 | 时间维度 | 图表类型 |
|------|--------|---------|---------|
| 偏差率趋势 | tasks 表（estimated_minutes vs actual_minutes） | 日/周/月 | 折线图 |
| 学习时长趋势 | pomodoro_sessions 表（focus_minutes） | 日/周/月 | 柱状图 |
| 任务完成率趋势 | tasks 表（completed/total） | 日/周/月 | 折线图 |
| 准确率趋势 | tasks 表（accuracy_rate） | 日/周/月 | 折线图 |

### 6.3 任务分解

#### 任务 6.1：创建趋势图API

- **操作**：新建文件
- **文件**：`src/app/api/trends/route.ts`
- **改动**：
  - `GET`：返回趋势数据，支持参数：
    - `metric`：偏差率/学习时长/完成率/准确率
    - `period`：daily/weekly/monthly
    - `days`：时间范围（默认7天，可选30天）
  - 数据从 tasks、pomodoro_sessions 表聚合计算
  - 返回格式：`{ labels: string[], values: number[] }`
- **依赖**：无
- **复杂度**：中

#### 任务 6.2：创建趋势图组件

- **操作**：新建文件
- **文件**：
  - `src/components/charts/DeviationChart.tsx` -- 偏差率趋势折线图
  - `src/components/charts/StudyTimeChart.tsx` -- 学习时长趋势柱状图
  - `src/components/charts/CompletionChart.tsx` -- 任务完成率趋势折线图
  - `src/components/charts/AccuracyChart.tsx` -- 准确率趋势折线图
  - `src/components/charts/TrendSection.tsx` -- 趋势图容器（可折叠，含时间维度切换）
- **改动**：
  - 每个图表组件使用 recharts 的 `LineChart` / `BarChart`
  - 适配4套主题的CSS变量颜色
  - 支持日/周/月维度切换
  - `TrendSection.tsx` 组合4个图表，支持折叠/展开
- **依赖**：任务 6.1
- **复杂度**：中

#### 任务 6.3：集成趋势图到看板

- **操作**：修改文件
- **文件**：`src/components/kanban/KanbanBoard.tsx`
- **改动**：
  - 在看板中嵌入 `TrendSection` 组件
  - 默认折叠，用户点击展开
- **依赖**：任务 6.2、任务 1.2
- **复杂度**：小

---

## 7. 子系统5：结构化复盘

### 7.1 目标

重构日/周/月总结页面，将自由textarea改为引导式复盘模板，自动填充"计划vs实际"对比数据，通过引导问题帮助用户深入思考。

### 7.2 引导式复盘模板设计

#### 日总结模板

```
1. 今日数据概览（自动填充）
   - 任务完成：3/5
   - 规划时长：240min / 实际：180min
   - 偏差率：25%
   - 获得积分：45分

2. 对比差距（自动填充 + 用户确认）
   - 哪个任务完成得好？为什么？
   - 哪个任务没完成？为什么？

3. 原因分析（引导问题）
   - 今天最大的干扰是什么？
   - 时间安排合理吗？

4. 调整方案（引导问题）
   - 明天怎么调？
   - 需要改变什么习惯？
```

#### 周总结模板

```
1. 本周数据概览（自动填充）
   - 完成率趋势、偏差率趋势
   - 积分变化

2. 模式识别（引导问题）
   - 哪几天效率最高？为什么？
   - 哪些科目花费时间最多？

3. 复盘反思
   - 本周最大的收获
   - 需要改进的地方

4. 下周计划
   - 调整什么
   - 新的目标
```

### 7.3 任务分解

#### 任务 7.1：扩展总结API支持结构化数据

- **操作**：修改文件
- **文件**：`src/app/api/reviews/route.ts`
- **改动**：
  - 修改 `POST` 请求体，支持结构化复盘数据：
    ```json
    {
      "mood": 4,
      "structured_review": {
        "good_tasks": ["任务1完成得好，因为..."],
        "unfinished_tasks": ["任务3没完成，因为..."],
        "distractions": "最大的干扰是...",
        "time_evaluation": "时间安排...",
        "tomorrow_adjustments": "明天调整..."
      },
      "free_text": "补充说明（可选）"
    }
    ```
  - `GET` 响应增加 `plan_vs_actual` 自动计算数据
  - 保持向后兼容（旧格式的 review_text 仍然支持读取）
- **依赖**：无
- **复杂度**：中

#### 任务 7.2：创建引导式复盘组件

- **操作**：新建文件
- **文件**：
  - `src/components/review/StructuredReview.tsx` -- 引导式复盘表单主组件
  - `src/components/review/DataOverview.tsx` -- 自动填充的数据概览卡片
  - `src/components/review/GuidedQuestion.tsx` -- 引导问题组件（带提示文字）
  - `src/components/review/TaskComparison.tsx` -- 任务对比组件（哪个好/哪个没完成）
- **改动**：
  - `StructuredReview.tsx`：分步骤引导式表单，每步一个卡片
  - `DataOverview.tsx`：展示自动计算的统计数据（任务完成率、偏差率、学习时长等）
  - `GuidedQuestion.tsx`：单个引导问题，包含问题标题、提示文字、输入区域
  - `TaskComparison.tsx`：展示每个任务的计划vs实际，用户选择"完成得好"/"没完成"并填写原因
- **依赖**：任务 7.1
- **复杂度**：大

#### 任务 7.3：重构日总结页面

- **操作**：修改文件
- **文件**：`src/app/(main)/review/daily/page.tsx`
- **改动**：
  - 替换现有的自由textarea为 `StructuredReview` 组件
  - 保留心情选择器
  - 保留庆祝动画
  - 保留已提交状态的展示
  - 从侧边栏导航进入（而非从看板跳转）
- **依赖**：任务 7.2
- **复杂度**：中

#### 任务 7.4：重构周总结页面

- **操作**：修改文件
- **文件**：`src/app/(main)/review/weekly/page.tsx`
- **改动**：
  - 替换为引导式周复盘模板
  - 自动填充本周趋势数据
  - 引导问题聚焦模式识别和下周调整
- **依赖**：任务 7.2
- **复杂度**：中

#### 任务 7.5：重构月总结页面

- **操作**：修改文件
- **文件**：`src/app/(main)/review/monthly/page.tsx`
- **改动**：
  - 替换为引导式月复盘模板
  - 自动填充月度趋势数据
  - 引导问题聚焦长期目标和习惯养成
- **依赖**：任务 7.2
- **复杂度**：中

---

## 8. 子系统6：导航重构

### 8.1 目标

去掉底部5个Tab导航，改为看板单页面 + 顶部栏 + 侧边栏/抽屉导航。

### 8.2 导航架构设计

```
顶部栏（固定）：
+------------------------------------------+
|  虚拟校园          120分  [铃铛] [菜单]  |
+------------------------------------------+

侧边栏/抽屉（点击菜单展开）：
+------------------------------------------+
|  [头像] 同学                              |
|                                          |
|  > 规划管理                               |
|    - 日规划                               |
|    - 周规划                               |
|    - 月规划                               |
|  > 总结                                   |
|    - 日总结                               |
|    - 周总结                               |
|    - 月总结                               |
|  > 积分详情                               |
|  > 播报存档                               |
|  > 个人设置                               |
|    - 外观                                 |
|    - 账号                                 |
+------------------------------------------+
```

### 8.3 任务分解

#### 任务 8.1：创建侧边栏组件

- **操作**：新建文件
- **文件**：`src/components/navigation/Sidebar.tsx`
- **改动**：
  - 基于 Sheet 组件实现侧边栏抽屉
  - 包含用户头像/昵称
  - 导航链接列表：规划管理、总结、积分详情、播报存档、个人设置
  - 每个导航项可展开子菜单
  - 点击导航项关闭侧边栏并跳转
- **依赖**：任务 5.1（Sheet 组件）
- **复杂度**：中

#### 任务 8.2：改造顶部栏

- **操作**：修改文件
- **文件**：`src/app/(main)/layout.tsx`
- **改动**：
  - 顶部栏增加：通知铃铛（播报提醒，显示未读数量红点）、菜单按钮（打开侧边栏）
  - 积分显示保留
  - 铃铛点击时如果有未读播报，打开播报弹窗
  - 集成 `Sidebar` 组件
- **依赖**：任务 8.1、任务 2.5
- **复杂度**：中

#### 任务 8.3：移除底部导航

- **操作**：修改文件
- **文件**：`src/app/(main)/layout.tsx`
- **改动**：
  - 移除 `<BottomNav />` 组件引用
  - 移除 `main` 元素的 `pb-16` 底部内边距（不再需要为底部导航留空间）
- **依赖**：任务 8.2
- **复杂度**：小

#### 任务 8.4：废弃 BottomNav 组件

- **操作**：删除文件
- **文件**：`src/components/BottomNav.tsx`
- **改动**：
  - 删除底部导航组件
  - 清理相关引用（仅 `layout.tsx` 引用，已在任务 8.3 中处理）
- **依赖**：任务 8.3
- **复杂度**：小

#### 任务 8.5：更新路由结构

- **操作**：修改文件
- **文件**：
  - `src/app/page.tsx`（根页面，登录前Landing Page）
  - `src/app/(main)/page.tsx`（看板主页）
  - `src/middleware.ts`（如需调整路由守卫）
- **改动**：
  - `src/app/page.tsx`：保持现有逻辑（未登录显示Landing Page，已登录redirect到 `(main)/`）
  - `src/app/(main)/page.tsx`：从 redirect 改为看板主页（任务 1.1）
  - 确保所有页面路由正常工作
- **依赖**：任务 1.1
- **复杂度**：小

---

## 9. 文件变更总清单

### 9.1 新建文件（约20个）

| 文件路径 | 子系统 | 说明 |
|---------|--------|------|
| `supabase/migration-003-broadcasts.sql` | 播报系统 | 播报表 + 已读记录表 |
| `src/app/api/broadcasts/route.ts` | 播报系统 | 播报管理API |
| `src/app/api/broadcasts/view/route.ts` | 播报系统 | 播报已读API |
| `src/app/api/trends/route.ts` | 数据可视化 | 趋势数据API |
| `src/app/api/kanban/route.ts` | 看板主界面 | 看板聚合API（可选） |
| `src/app/(main)/broadcasts/page.tsx` | 播报系统 | 播报存档页面 |
| `src/components/kanban/KanbanBoard.tsx` | 看板主界面 | 看板主容器 |
| `src/components/kanban/TaskList.tsx` | 看板主界面 | 任务列表 |
| `src/components/kanban/PlanVsActual.tsx` | 看板主界面 | 计划vs实际对比 |
| `src/components/kanban/TodoSection.tsx` | 看板主界面 | 待办事项区 |
| `src/components/kanban/SceneShortcuts.tsx` | 看板主界面 | 场景快捷入口 |
| `src/components/kanban/QuickPlan.tsx` | 看板主界面 | 快速规划区 |
| `src/components/broadcast/BroadcastPopup.tsx` | 播报系统 | 播报弹窗 |
| `src/components/scene/ScenePanel.tsx` | 场景面板化 | 场景面板容器 |
| `src/components/scene/LibraryPanel.tsx` | 场景面板化 | 图书馆面板 |
| `src/components/scene/StudyRoomPanel.tsx` | 场景面板化 | 自习室面板 |
| `src/components/charts/DeviationChart.tsx` | 数据可视化 | 偏差率趋势图 |
| `src/components/charts/StudyTimeChart.tsx` | 数据可视化 | 学习时长趋势图 |
| `src/components/charts/CompletionChart.tsx` | 数据可视化 | 完成率趋势图 |
| `src/components/charts/AccuracyChart.tsx` | 数据可视化 | 准确率趋势图 |
| `src/components/charts/TrendSection.tsx` | 数据可视化 | 趋势图容器 |
| `src/components/review/StructuredReview.tsx` | 结构化复盘 | 引导式复盘表单 |
| `src/components/review/DataOverview.tsx` | 结构化复盘 | 数据概览卡片 |
| `src/components/review/GuidedQuestion.tsx` | 结构化复盘 | 引导问题组件 |
| `src/components/review/TaskComparison.tsx` | 结构化复盘 | 任务对比组件 |
| `src/components/navigation/Sidebar.tsx` | 导航重构 | 侧边栏 |
| `src/components/ui/sheet.tsx` | 场景面板化 | shadcn Sheet组件 |

### 9.2 修改文件（约10个）

| 文件路径 | 子系统 | 改动说明 |
|---------|--------|---------|
| `src/types/index.ts` | 播报系统 | 新增 Broadcast、BroadcastView 类型 |
| `src/app/(main)/page.tsx` | 看板主界面 | 从 redirect 改为看板主页 |
| `src/app/(main)/layout.tsx` | 导航重构 | 移除 BottomNav，新增顶部栏铃铛+菜单，集成侧边栏 |
| `src/app/api/today/route.ts` | 看板主界面 | 扩展返回字段（趋势数据、计划vs实际） |
| `src/app/api/reviews/route.ts` | 结构化复盘 | 支持结构化复盘数据格式 |
| `src/app/(main)/review/daily/page.tsx` | 结构化复盘 | 替换为引导式复盘 |
| `src/app/(main)/review/weekly/page.tsx` | 结构化复盘 | 替换为引导式复盘 |
| `src/app/(main)/review/monthly/page.tsx` | 结构化复盘 | 替换为引导式复盘 |
| `src/app/(main)/dashboard/page.tsx` | 看板主界面 | 调整为纯规划管理页（移除总结Tab） |
| `src/app/(main)/profile/points/page.tsx` | 导航重构 | 更新返回链接（从 `/` 而非 `/today`） |

### 9.3 删除文件（约5个）

| 文件路径 | 子系统 | 说明 |
|---------|--------|------|
| `src/app/(main)/today/page.tsx` | 看板主界面 | 功能迁移到看板主页 |
| `src/app/(main)/campus/library/page.tsx` | 场景面板化 | 功能迁移到面板组件 |
| `src/app/(main)/campus/study-room/page.tsx` | 场景面板化 | 功能迁移到面板组件 |
| `src/app/(main)/campus/page.tsx` | 场景面板化 | 功能迁移到看板快捷入口 |
| `src/components/BottomNav.tsx` | 导航重构 | 替换为侧边栏 |

### 9.4 保持不变的文件

| 文件路径 | 说明 |
|---------|------|
| `src/app/page.tsx` | 登录前Landing Page（保持不变） |
| `src/app/(auth)/login/page.tsx` | 登录页 |
| `src/app/(auth)/register/page.tsx` | 注册页 |
| `src/app/(auth)/layout.tsx` | 认证布局 |
| `src/app/(main)/campus/dormitory/page.tsx` | 宿舍页（保持独立页面） |
| `src/app/(main)/profile/page.tsx` | 个人主页 |
| `src/app/(main)/profile/appearance/page.tsx` | 外观设置 |
| `src/app/(main)/profile/settings/page.tsx` | 个人设置 |
| `src/components/PomodoroTimer.tsx` | 番茄钟（复用） |
| `src/components/PlanForm.tsx` | 规划表单（复用） |
| `src/components/PlanSummary.tsx` | 规划摘要（复用） |
| `src/components/WeekPlanTab.tsx` | 周规划Tab（复用） |
| `src/components/MonthPlanTab.tsx` | 月规划Tab（复用） |
| `src/components/SummaryTab.tsx` | 总结Tab（可能调整入口链接） |
| `src/components/GuideOverlay.tsx` | 引导覆盖层 |
| `src/components/GuideProvider.tsx` | 引导上下文 |
| `src/components/ProtectedRoute.tsx` | 路由守卫 |
| `src/components/ThemeProvider.tsx` | 主题提供者 |
| `src/components/ThemeInitializer.tsx` | 主题初始化 |
| `src/lib/*` | 所有lib文件 |
| `src/hooks/*` | 所有hooks |
| `src/middleware.ts` | 中间件 |
| `src/app/api/plan/*` | 计划API |
| `src/app/api/tasks/route.ts` | 任务API |
| `src/app/api/scene/route.ts` | 场景API |
| `src/app/api/pomodoro/route.ts` | 番茄钟API |
| `src/app/api/sleep/route.ts` | 睡眠API |
| `src/app/api/points/route.ts` | 积分API |
| `src/app/api/profile/route.ts` | 用户资料API |
| `src/app/api/weekly-plan/route.ts` | 周计划API |
| `src/app/api/monthly-plan/route.ts` | 月计划API |
| `supabase/schema.sql` | 原始Schema（不修改，新表用迁移文件） |

---

## 10. 执行顺序与依赖关系

### 10.1 依赖关系图

```
子系统6（导航重构）
  ├── 任务 8.1（侧边栏） ──→ 任务 8.2（顶部栏） ──→ 任务 8.3（移除BottomNav）
  └── 任务 8.4（删除BottomNav）
         │
         ▼
子系统1（看板主界面）── 依赖导航重构完成
  ├── 任务 1.3（看板API）
  ├── 任务 1.2（看板子组件）── 依赖子系统3、子系统4
  ├── 任务 1.1（看板主页）
  └── 任务 1.5（废弃旧今日页）

子系统4（数据可视化）── 可并行
  ├── 任务 6.1（趋势API）
  └── 任务 6.2（趋势图组件）──→ 任务 6.3（集成到看板）

子系统3（场景面板化）── 可并行
  ├── 任务 5.1（Sheet组件）
  ├── 任务 5.2（场景面板容器）──→ 任务 5.3/5.4（图书馆/自习室面板）
  └── 任务 5.5（集成到看板）──→ 任务 5.6（废弃旧页面）

子系统2（播报系统）── 可并行
  ├── 任务 2.1（数据库迁移）
  ├── 任务 2.2（类型定义）
  ├── 任务 2.3/2.4（API）
  ├── 任务 2.5（播报弹窗）
  └── 任务 2.6（播报存档页）

子系统5（结构化复盘）── 依赖看板数据
  ├── 任务 7.1（扩展总结API）
  ├── 任务 7.2（引导式复盘组件）
  └── 任务 7.3/7.4/7.5（重构总结页面）
```

### 10.2 推荐执行顺序（6个阶段）

#### 阶段1：基础设施（预计 0.5 天）

无外部依赖，可立即开始。

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 1.1 | 任务 5.1：添加 shadcn Sheet 组件 | 小 | 面板基础组件 |
| 1.2 | 任务 2.1：创建播报数据库迁移 | 小 | 数据库变更 |
| 1.3 | 任务 2.2：添加播报类型定义 | 小 | 类型定义 |
| 1.4 | 任务 6.1：创建趋势图API | 中 | 数据聚合 |

#### 阶段2：导航重构（预计 1 天）

为后续看板主页做准备。

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 2.1 | 任务 8.1：创建侧边栏组件 | 中 | 新导航方式 |
| 2.2 | 任务 8.2：改造顶部栏 | 中 | 集成铃铛+菜单 |
| 2.3 | 任务 8.3：移除底部导航 | 小 | 从layout中移除 |
| 2.4 | 任务 8.4：废弃 BottomNav 组件 | 小 | 删除文件 |
| 2.5 | 任务 8.5：更新路由结构 | 小 | 确保路由正常 |

#### 阶段3：场景面板化 + 数据可视化（预计 2 天，可并行）

两个子系统无互相依赖，可同时开发。

**场景面板化分支：**

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 3.1 | 任务 5.2：创建场景面板通用容器 | 大 | Sheet封装 |
| 3.2 | 任务 5.3：提取图书馆面板 | 中 | 逻辑迁移 |
| 3.3 | 任务 5.4：提取自习室面板 | 中 | 逻辑迁移 |

**数据可视化分支：**

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 3.4 | 任务 6.2：创建趋势图组件 | 中 | 4个图表 |
| 3.5 | 任务 6.3：集成趋势图到看板 | 小 | 嵌入看板 |

#### 阶段4：看板主界面（预计 2 天）

依赖阶段2和阶段3完成。

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 4.1 | 任务 1.3：创建看板聚合API | 中 | 数据聚合 |
| 4.2 | 任务 1.2：创建看板子组件 | 大 | 6个子组件 |
| 4.3 | 任务 1.4：看板内联任务编辑 | 中 | 内联交互 |
| 4.4 | 任务 1.1：创建看板主页面 | 大 | 替换redirect |
| 4.5 | 任务 5.5：集成场景面板到看板 | 中 | 面板触发 |
| 4.6 | 任务 5.6：废弃旧场景页面 | 小 | 删除文件 |
| 4.7 | 任务 1.5：废弃旧今日页 | 小 | 删除文件 |

#### 阶段5：播报系统（预计 1 天，可与阶段4并行）

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 5.1 | 任务 2.3：创建播报管理API | 中 | CRUD |
| 5.2 | 任务 2.4：创建播报客户端API | 小 | 已读管理 |
| 5.3 | 任务 2.5：创建播报弹窗组件 | 大 | 强制弹窗 |
| 5.4 | 任务 2.6：创建播报存档页面 | 中 | 历史列表 |

#### 阶段6：结构化复盘（预计 1.5 天）

依赖阶段4完成（需要看板数据支撑）。

| 序号 | 任务 | 复杂度 | 说明 |
|------|------|--------|------|
| 6.1 | 任务 7.1：扩展总结API | 中 | 结构化数据 |
| 6.2 | 任务 7.2：创建引导式复盘组件 | 大 | 4个组件 |
| 6.3 | 任务 7.3：重构日总结页面 | 中 | 替换表单 |
| 6.4 | 任务 7.4：重构周总结页面 | 中 | 替换表单 |
| 6.5 | 任务 7.5：重构月总结页面 | 中 | 替换表单 |

### 10.3 总工时估算

| 阶段 | 预计工时 | 并行可能性 |
|------|---------|-----------|
| 阶段1：基础设施 | 0.5 天 | 串行 |
| 阶段2：导航重构 | 1 天 | 串行 |
| 阶段3：场景面板化 + 数据可视化 | 2 天 | 两个分支并行 |
| 阶段4：看板主界面 | 2 天 | 与阶段5部分并行 |
| 阶段5：播报系统 | 1 天 | 与阶段4部分并行 |
| 阶段6：结构化复盘 | 1.5 天 | 串行 |
| **总计** | **约 5-6 个工作日** | |

---

## 11. 风险点与应对方案

### 11.1 数据迁移风险

**风险**：重构过程中可能影响现有用户数据。

**应对**：
- 数据库变更仅新增表（broadcasts、broadcast_views），不修改现有表结构
- 总结API扩展保持向后兼容（旧格式 review_text 仍可读取）
- 不删除任何现有数据库触发器
- 新增迁移文件独立于现有 schema.sql

### 11.2 看板性能风险

**风险**：看板主页聚合大量数据，可能导致首屏加载缓慢。

**应对**：
- 使用 `/api/today` 扩展或新建 `/api/kanban` 聚合API，一次请求获取所有数据
- 趋势图数据默认不加载（折叠状态），用户展开时才请求
- 场景面板按需加载（点击时才获取任务详情和签到状态）
- 考虑使用 React Suspense + loading skeleton 提升感知性能

### 11.3 场景面板状态管理风险

**风险**：场景面板从独立页面改为面板后，签到/签退状态管理变复杂。

**应对**：
- 面板打开时自动检查是否有活跃签到
- 面板关闭时自动签退（可配置是否自动签退）
- 签到状态通过 API 实时查询，不依赖本地状态
- 使用 Sheet 组件的 `onOpenChange` 回调处理签退逻辑

### 11.4 导航变更的用户习惯风险

**风险**：用户已习惯底部Tab导航，突然改为侧边栏可能造成困惑。

**应对**：
- 首次进入新版本时显示引导提示（利用现有 GuideProvider 机制）
- 侧边栏菜单项使用清晰的图标和文字
- 看板主页底部保留场景快捷入口（最常用的场景操作不需要打开侧边栏）
- 顶部栏的菜单按钮使用明显的汉堡图标

### 11.5 播报系统滥用风险

**风险**：播报弹窗强制显示，如果管理员频繁发布可能影响用户体验。

**应对**：
- 播报支持过期时间（expires_at），过期后不再弹窗
- 每次最多弹窗3条未读播报，更多可在存档页查看
- 管理API限制发布频率（如每天最多1条）
- 用户标记已读后不再重复弹窗

### 11.6 recharts 主题适配风险

**风险**：4套主题（journal/pixel/zen/magazine）的配色差异大，图表颜色可能不协调。

**应对**：
- 图表颜色使用CSS变量而非硬编码
- 为每个主题在 `globals.css` 中定义图表专用CSS变量（如 `--chart-primary`、`--chart-secondary`）
- 使用 recharts 的 `stroke` 和 `fill` 属性绑定CSS变量

### 11.7 结构化复盘数据兼容性风险

**风险**：旧版总结数据为自由文本，新版为结构化数据，需要兼容展示。

**应对**：
- API返回时同时包含 `review_text`（旧格式）和 `structured_review`（新格式）
- 前端展示时优先使用结构化数据，fallback到自由文本
- 旧数据不可编辑为结构化格式（只读展示）

### 11.8 组件拆分粒度风险

**风险**：看板子组件拆分过细可能导致组件间通信复杂。

**应对**：
- `KanbanBoard.tsx` 作为唯一数据获取层，通过 props 向下传递数据
- 子组件保持纯展示 + 回调模式（不自行获取数据）
- 使用 React Context 仅在必要时共享状态（如场景面板的开关状态）

---

## 附录：技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 面板组件 | shadcn Sheet（底部滑出） | 移动端友好，符合用户习惯 |
| 趋势图库 | recharts（已安装） | 无需新增依赖，功能满足需求 |
| 看板数据获取 | 单一聚合API | 减少请求数，提升首屏性能 |
| 播报弹窗 | 自定义全屏弹窗 | 需要强制显示 + 视频播放，Dialog不够灵活 |
| 侧边栏 | Sheet抽屉（右侧展开） | 移动端标准模式，不占用看板空间 |
| 复盘数据存储 | JSON字段存储 | 灵活，避免频繁修改表结构 |
| 宿舍页面 | 保持独立页面 | 睡眠打卡流程特殊（入睡+起床两步），不适合面板化 |
