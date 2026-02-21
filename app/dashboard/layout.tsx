import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { BackgroundLayout } from '@/components/background-layout'
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (session == null) redirect('/login')
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background relative pt-14 md:pt-0">
        <BackgroundLayout />
        <div className="relative z-10">{children}</div>
      </main>
    </div>
  )
}
