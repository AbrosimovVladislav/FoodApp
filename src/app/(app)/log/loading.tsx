import { Skeleton } from '@/components/ui/skeleton'

export default function LogLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      {/* Date nav */}
      <div className="flex items-center justify-between">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-28 h-5 rounded" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      {/* КБЖУ summary card */}
      <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
        <div className="flex justify-between">
          <Skeleton className="w-24 h-4 rounded" />
          <Skeleton className="w-28 h-4 rounded" />
        </div>
        <Skeleton className="w-full h-2 rounded-full" />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-8 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Meal plan entries */}
      <Skeleton className="w-24 h-3 rounded" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex justify-between rounded-lg border border-border px-3 py-2.5">
          <Skeleton className="w-28 h-4 rounded" />
          <Skeleton className="w-16 h-4 rounded" />
        </div>
      ))}

      {/* Actions */}
      <div className="mt-auto pt-2 flex flex-col gap-2">
        <Skeleton className="w-full h-11 rounded-lg" />
        <Skeleton className="w-full h-11 rounded-lg" />
      </div>
    </div>
  )
}
