import { BottomNav } from '@/components/shared/bottom-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md min-h-screen flex flex-col pb-14">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
