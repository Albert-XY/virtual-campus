import StructuredReview from '@/components/review/StructuredReview'

export default function WeeklyReviewPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <StructuredReview period="weekly" periodLabel="周总结" />
    </div>
  )
}
