import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import SettingsClient from '@/components/settings/SettingsClient'


export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const [bankDetails, currentGroup] = await Promise.all([
    prisma.bankDetails.findFirst({
      where: { groupId: user.groupId },
    }),
    prisma.group.findUnique({
      where: { id: user.groupId },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        _count: { select: { users: true, meetings: true } },
      },
    }),
  ])

  return (
    <SettingsClient
      initialData={bankDetails}
      currentGroup={currentGroup}
      userRole={user.role}
    />
  )
}
