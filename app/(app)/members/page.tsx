import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import MembersClient from '@/components/members/MembersClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members' }

export default async function MembersPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const members = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { meetingAttendees: true },
      },
    },
  })

  return <MembersClient members={members} currentUserId={user.id} />
}
