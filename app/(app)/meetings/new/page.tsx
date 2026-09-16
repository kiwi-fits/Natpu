import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import NewMeetingForm from '@/components/meetings/NewMeetingForm'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'New Meeting' }

export default async function NewMeetingPage() {
  const user = await getAuthUser()
  if (!user || user.role !== 'ADMIN') redirect('/dashboard')

  const members = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })

  return <NewMeetingForm members={members} />
}
