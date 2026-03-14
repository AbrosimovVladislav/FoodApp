import { Skeleton } from '@/components/ui/skeleton'

export default function SettingsLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-6 pb-6 gap-6">
      <Skeleton className="w-24 h-6 rounded" />

      <div className="flex flex-col gap-2">
        <Skeleton className="w-36 h-4 rounded" />
        <Skeleton className="w-full h-12 rounded-lg" />
        <Skeleton className="w-48 h-3 rounded" />
      </div>

      <div className="flex flex-col gap-2">
        <Skeleton className="w-32 h-4 rounded" />
        <Skeleton className="w-full h-12 rounded-lg" />
      </div>

      <Skeleton className="w-full h-12 rounded-lg" />

      <Skeleton className="w-full h-px rounded" />

      <div className="flex flex-col gap-3">
        <Skeleton className="w-20 h-3 rounded" />
        <Skeleton className="w-40 h-4 rounded" />
        <Skeleton className="w-full h-12 rounded-lg" />
      </div>
    </div>
  )
}
