import { Skeleton } from '@/components/ui/skeleton'

export default function DishesLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-24 h-6 rounded" />
        <Skeleton className="w-24 h-9 rounded-lg" />
      </div>

      {/* Search */}
      <Skeleton className="w-full h-10 rounded-lg" />

      {/* Dish cards */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-3 flex items-center justify-between">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-32 h-4 rounded" />
            <Skeleton className="w-20 h-3 rounded" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="w-16 h-4 rounded" />
            <Skeleton className="w-24 h-3 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}
