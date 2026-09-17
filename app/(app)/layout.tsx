import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import BottomNav from '@/components/layout/BottomNav'
import { Toaster } from 'sonner'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      <main className="pb-20">
        {children}
      </main>
      <BottomNav role={user.role} />
    </div>
  )
}
