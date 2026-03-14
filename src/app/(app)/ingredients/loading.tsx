import { Skeleton } from '@/components/ui/skeleton'

export default function IngredientsLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-28 h-6 rounded" />
        <Skeleton className="w-24 h-9 rounded-lg" />
      </div>

      {/* Search */}
      <Skeleton className="w-full h-10 rounded-lg" />

      {/* Ingredient rows */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-28 h-4 rounded" />
            <Skeleton className="w-16 h-3 rounded" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
