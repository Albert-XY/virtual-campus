import StructuredReview from '@/components/review/StructuredReview'

export default function DailyReviewPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <StructuredReview period="daily" periodLabel="日总结" />
    </div>
  )
}
