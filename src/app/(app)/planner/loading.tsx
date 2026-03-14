import { Skeleton } from '@/components/ui/skeleton'

export default function PlannerLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-36 h-5 rounded" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      {/* Day cards */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <Skeleton className="w-24 h-4 rounded" />
            <Skeleton className="w-16 h-4 rounded" />
          </div>
          <Skeleton className="w-full h-1.5 rounded-full" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="w-full h-8 rounded-lg" />
            <Skeleton className="w-3/4 h-8 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}
