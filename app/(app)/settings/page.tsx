import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/auth/helpers'
import { prisma } from '@/lib/db'
import SettingsClient from '@/components/settings/SettingsClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings' }

export default async function SettingsPage() {
  const user = await getAuthUser()
  if (!user) redirect('/login')

  const bankDetails = await prisma.bankDetails.findFirst()

  return <SettingsClient initialData={bankDetails} />
}
