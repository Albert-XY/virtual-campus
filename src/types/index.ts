// ============================================================
// 用户
// ============================================================
export interface User {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  total_points: number
  current_level: number
  created_at: string
}

// ============================================================
// 每日计划
// ============================================================
export interface StudyBlock {
  start: string
  end: string
}

export interface RestBlock {
  start: string
  end: string
  type: 'breakfast' | 'lunch' | 'dinner'
}

export type PlanTaskType = 'knowledge' | 'practice' | 'collaboration' | 'self'

export interface PlanTask {
  id: number
  type?: PlanTaskType
  subject: string
  topic: string
  estimated_min: number
}

export interface DailyPlan {
  id: string
  user_id: string
  plan_date: string
  study_blocks: StudyBlock[]
  rest_blocks: RestBlock[]
  tasks: PlanTask[]
  is_completed: boolean
}

// ============================================================
// 场景
// ============================================================
export type SceneType =
  | 'library'
  | 'study-room'
  | 'exam-center'
  | 'sports'
  | 'canteen'
  | 'dormitory'
  | 'bulletin'
  | 'shop'

export interface SceneCheckin {
  id: string
  user_id: string
  plan_id: string
  scene: SceneType
  check_in_at: string
  check_out_at: string | null
  duration_minutes: number | null
  points_earned: number
  is_in_study_block: boolean
}

// ============================================================
// 番茄钟
// ============================================================
export interface PomodoroSession {
  id: string
  user_id: string
  checkin_id: string
  scene: SceneType
  focus_minutes: number
  break_minutes: number
  started_at: string
  ended_at: string | null
  is_completed: boolean
}

// ============================================================
// 积分日志
// ============================================================
export interface PointsLog {
  id: string
  user_id: string
  points: number
  type: string
  description: string
  related_id: string | null
  created_at: string
}

// ============================================================
// 任务
// ============================================================
export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export interface Task {
  id: string
  user_id: string
  plan_id: string
  task_index: number
  task_type: string
  subject: string
  topic: string
  estimated_minutes: number
  actual_minutes: number | null
  accuracy_rate: number | null
  points_earned: number
  status: TaskStatus
  completed_at: string | null
  created_at: string
}

// ============================================================
// 睡眠记录
// ============================================================
export interface SleepLog {
  id: string
  user_id: string
  log_date: string
  sleep_time: string
  wake_time: string
  points_earned: number
}

// ============================================================
// 播报
// ============================================================
export type BroadcastContentType = 'text' | 'image' | 'video'

export interface Broadcast {
  id: string
  title: string
  content_type: BroadcastContentType
  content: string
  media_url: string | null
  is_published: boolean
  published_at: string | null
  created_by: string | null
  created_at: string
  expires_at: string | null
}

export interface BroadcastView {
  id: string
  user_id: string
  broadcast_id: string
  viewed_at: string
}
