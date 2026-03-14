import { Skeleton } from '@/components/ui/skeleton'

export default function ChatLoading() {
  return (
    <div className="flex flex-col flex-1 px-4 pt-4 pb-6 gap-4">
      <Skeleton className="w-16 h-6 rounded" />
      <div className="flex-1 flex flex-col justify-end gap-3">
        <Skeleton className="w-3/4 h-12 rounded-2xl self-start" />
        <Skeleton className="w-1/2 h-10 rounded-2xl self-end" />
        <Skeleton className="w-2/3 h-14 rounded-2xl self-start" />
      </div>
      <Skeleton className="w-full h-12 rounded-xl" />
    </div>
  )
}
