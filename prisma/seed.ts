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
  await prisma.group.deleteMany()

  console.log('🏢 Creating default Natpu group...')
  const natpuGroup = await prisma.group.create({
    data: {
      name: 'Natpu',
      slug: 'natpu',
      password: '123456789Natpu',
    },
  })

  console.log('👤 Creating clean Admin user...')
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@splitmeet.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      groupId: natpuGroup.id,
    },
  })

  console.log('🏦 Creating default bank details...')
  await prisma.bankDetails.create({
    data: {
      bankName: 'Commercial Bank',
      accountName: 'Natpu Admin',
      accountNumber: '1234567890',
      branch: 'Main Branch',
      groupId: natpuGroup.id,
    },
  })

  console.log('👥 Creating default members...')
  const members = [
    { name: 'Ajith', email: 'ajith.235ty@splitmeet.local' },
    { name: 'Thanu', email: 'thanu.q64ga@splitmeet.local' },
    { name: 'Regin', email: 'regin.jwfxd@splitmeet.local' },
  ]
  for (const m of members) {
    await prisma.user.create({
      data: {
        name: m.name,
        email: m.email,
        role: 'MEMBER',
        status: 'ACTIVE',
        groupId: natpuGroup.id,
      },
    })
  }

  console.log('✅ Local database seeded successfully with Natpu group!')
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
