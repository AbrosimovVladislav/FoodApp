import { Skeleton } from '@/components/ui/skeleton'

export default function ShoppingLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-32 h-5 rounded" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      {/* Generate button */}
      <Skeleton className="w-full h-10 rounded-lg" />

      {/* Category label */}
      <Skeleton className="w-20 h-3 rounded" />

      {/* Shopping items */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton className="w-5 h-5 rounded" />
          <div className="flex-1 flex justify-between">
            <Skeleton className="w-28 h-4 rounded" />
            <Skeleton className="w-12 h-4 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
