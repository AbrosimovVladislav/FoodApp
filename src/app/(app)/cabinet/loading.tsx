import { Skeleton } from '@/components/ui/skeleton'

export default function CabinetLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-6">
      {/* Title */}
      <Skeleton className="w-32 h-6 rounded" />

      {/* Bar chart placeholder */}
      <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
        <Skeleton className="w-28 h-4 rounded" />
        <div className="flex items-end gap-1 h-24">
          {[40, 70, 55, 80, 45, 90, 60, 75, 50, 85, 65, 70, 40, 80].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Weekly avg */}
      <div className="rounded-xl border border-border p-4 flex flex-col gap-3">
        <Skeleton className="w-36 h-4 rounded" />
        <div className="grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <Skeleton className="w-10 h-3 rounded" />
              <Skeleton className="w-8 h-5 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Top dishes */}
      <div className="flex flex-col gap-2">
        <Skeleton className="w-24 h-3 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex justify-between py-1">
            <Skeleton className="w-36 h-4 rounded" />
            <Skeleton className="w-8 h-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
