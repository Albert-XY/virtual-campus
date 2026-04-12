import StructuredReview from '@/components/review/StructuredReview'

export default function MonthlyReviewPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-5">
      <StructuredReview period="monthly" periodLabel="月总结" />
    </div>
  )
}
