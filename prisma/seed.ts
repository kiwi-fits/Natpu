import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Cleaning existing data...')

  // Delete all dependent records
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.settlement.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.meetingAttendee.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.bankDetails.deleteMany()
  await prisma.user.deleteMany()

  console.log('👤 Creating clean Admin user...')
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@splitmeet.local',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  console.log('🏦 Creating default bank details...')
  await prisma.bankDetails.create({
    data: {
      bankName: 'Commercial Bank',
      accountName: 'Natpu Admin',
      accountNumber: '1234567890',
      branch: 'Main Branch',
    },
  })

  console.log('✅ Local database cleaned successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
