import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import MembersClient from '@/components/members/MembersClient'

import { Role, UserStatus } from '@/lib/types/database'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Members' }

export default async function MembersPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const members = await prisma.user.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    include: {
      _count: {
        select: { meetingAttendees: true },
      },
    },
  })

  const typedMembers = members.map(m => ({
    ...m,
    role: m.role as Role,
    status: m.status as UserStatus,
  }))

  return <MembersClient members={typedMembers} currentUserId={user.id} />
}
