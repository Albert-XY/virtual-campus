export function calculateSleepPoints(sleepTime: string): number {
  const [h, m] = sleepTime.split(':').map(Number)
  const minutes = h * 60 + m
  if (minutes <= 22 * 60 + 30) return 15
  if (minutes <= 23 * 60) return 8
  return 0
}

export function checkInStudyBlock(
  now: Date,
  studyBlocks: Array<{ start: string; end: string }>
): boolean {
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return studyBlocks.some(b => current >= b.start && current <= b.end)
}

export function checkOverStudyTime(
  now: Date,
  studyBlocks: Array<{ start: string; end: string }>
): boolean {
  const lastEnd = [...studyBlocks].sort((a, b) => b.end.localeCompare(a.end))[0]?.end
  if (!lastEnd) return false
  const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  return current > lastEnd
}

export function getOverMinutes(
  now: Date,
  studyBlocks: Array<{ start: string; end: string }>
): number {
  const lastEnd = [...studyBlocks].sort((a, b) => b.end.localeCompare(a.end))[0]?.end
  if (!lastEnd) return 0
  const [endH, endM] = lastEnd.split(':').map(Number)
  return Math.max(0, (now.getHours() * 60 + now.getMinutes()) - (endH * 60 + endM))
}

export function calculateTaskPoints(
  accuracyRate?: number,
  isInStudyBlock: boolean = false,
  isOverStudyTime: boolean = false,
  overMinutes: number = 0
): number {
  const basePoints = 10
  if (isOverStudyTime) {
    if (overMinutes > 120) return 0
    if (overMinutes > 60) return Math.floor(basePoints * 0.2)
    return Math.floor(basePoints * 0.5)
  }
  if (!isInStudyBlock) return Math.floor(basePoints * 0.5)
  let points = basePoints
  if (accuracyRate && accuracyRate > 0.9) points += 5
  return points
}

export function calculateDailyBonus(tasksCompleted: number): number {
  if (tasksCompleted >= 4) return 15
  return 0
}

export function calculateRating(coverageRate: number, detailAccuracy: number): string {
  if (coverageRate < 0.80 || detailAccuracy < 0.60) return 'D'
  if (coverageRate >= 0.80 && detailAccuracy >= 0.60) return 'C'
  if (coverageRate >= 0.90 && detailAccuracy >= 0.75) return 'B'
  if (coverageRate >= 0.95 && detailAccuracy >= 0.85) return 'A'
  if (coverageRate >= 1.00 && detailAccuracy >= 0.95) return 'S'
  return 'D'
}
