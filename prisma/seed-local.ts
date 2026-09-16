import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting local seed (no Supabase)...')

  // Clean up existing data
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.settlement.deleteMany()
  await prisma.expense.deleteMany()
  await prisma.meetingAttendee.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.bankDetails.deleteMany()
  await prisma.user.deleteMany()

  // Define users — using cuid-like IDs locally
  const usersData = [
    { id: 'local_admin_001', name: 'Admin', email: 'admin@splitmeet.app', role: 'ADMIN' as const },
    { id: 'local_alice_002', name: 'Alice', email: 'alice@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_bob_003', name: 'Bob', email: 'bob@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_charlie_004', name: 'Charlie', email: 'charlie@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_diana_005', name: 'Diana', email: 'diana@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_evan_006', name: 'Evan', email: 'evan@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_fiona_007', name: 'Fiona', email: 'fiona@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_george_008', name: 'George', email: 'george@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_hannah_009', name: 'Hannah', email: 'hannah@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_xander_010', name: 'Xander', email: 'xander@splitmeet.app', role: 'MEMBER' as const },
    { id: 'local_yara_011', name: 'Yara', email: 'yara@splitmeet.app', role: 'MEMBER' as const },
  ]

  console.log('\n💾 Creating DB users...')
  for (const u of usersData) {
    await prisma.user.create({
      data: {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: 'ACTIVE',
      },
    })
  }

  const userMap = Object.fromEntries(usersData.map(u => [u.name, u.id]))

  // Bank Details
  console.log('\n🏦 Creating bank details...')
  await prisma.bankDetails.create({
    data: {
      bankName: 'Commercial Bank',
      accountName: 'Friend Group',
      accountNumber: '1234567890',
      branch: 'Jaffna',
    },
  })

  const adminId = userMap['Admin']

  // ─── Meeting 1: Dinner at Nallur ─────────────────────────────────────────
  console.log('\n🍽️  Creating Meeting 1: Dinner at Nallur...')
  const meeting1 = await prisma.meeting.create({
    data: {
      title: 'Dinner at Nallur',
      date: new Date('2026-09-13T19:00:00'),
      location: 'Nallur Restaurant',
      notes: 'First group outing!',
      status: 'SETTLED',
      createdBy: adminId,
    },
  })

  const m1Attendees = ['Alice', 'Bob', 'Charlie', 'Diana', 'Evan', 'Fiona', 'George', 'Hannah']
  for (const name of m1Attendees) {
    await prisma.meetingAttendee.create({
      data: { meetingId: meeting1.id, userId: userMap[name] },
    })
  }

  const m1Expenses = [
    { name: 'Alice', amount: 3000 },
    { name: 'Bob', amount: 1500 },
    { name: 'Charlie', amount: 500 },
    { name: 'Diana', amount: 2000 },
    { name: 'Evan', amount: 1000 },
    { name: 'Fiona', amount: 0 },
    { name: 'George', amount: 0 },
    { name: 'Hannah', amount: 0 },
  ]
  for (const exp of m1Expenses) {
    await prisma.expense.create({
      data: { meetingId: meeting1.id, userId: userMap[exp.name], amount: exp.amount },
    })
  }

  const m1Settlements = [
    { name: 'Charlie', expected: 500 },
    { name: 'Fiona', expected: 1000 },
    { name: 'George', expected: 1000 },
    { name: 'Hannah', expected: 1000 },
  ]
  for (const s of m1Settlements) {
    await prisma.settlement.create({
      data: {
        meetingId: meeting1.id,
        userId: userMap[s.name],
        expectedAmount: s.expected,
        actualAmount: s.expected,
        status: 'SETTLED',
        settledAt: new Date('2026-09-13T21:00:00'),
        settledBy: adminId,
        note: 'Confirmed via bank transfer',
        submittedAt: new Date('2026-09-13T20:30:00'),
      },
    })
  }

  // ─── Meeting 2: Beach Trip (CALCULATED) ──────────────────────────────────
  console.log('\n🏖️  Creating Meeting 2: Beach Trip...')
  const meeting2 = await prisma.meeting.create({
    data: {
      title: 'Beach Trip',
      date: new Date('2026-09-15T10:00:00'),
      location: 'Casuarina Beach',
      status: 'OPEN',
      createdBy: adminId,
    },
  })

  const m2Attendees = ['Xander', 'Yara', 'Alice', 'Bob', 'Charlie']
  for (const name of m2Attendees) {
    await prisma.meetingAttendee.create({
      data: { meetingId: meeting2.id, userId: userMap[name] },
    })
  }

  const m2Expenses = [
    { name: 'Xander', amount: 5000 },
    { name: 'Yara', amount: 0 },
    { name: 'Alice', amount: 0 },
    { name: 'Bob', amount: 0 },
    { name: 'Charlie', amount: 0 },
  ]
  for (const exp of m2Expenses) {
    await prisma.expense.create({
      data: { meetingId: meeting2.id, userId: userMap[exp.name], amount: exp.amount },
    })
  }

  const m2Settlements = [
    { name: 'Yara', expected: 1000, status: 'SETTLED' as const, actualAmount: 1000 },
    { name: 'Alice', expected: 1000, status: 'SUBMITTED' as const, actualAmount: null },
    { name: 'Bob', expected: 1000, status: 'PENDING' as const, actualAmount: null },
    { name: 'Charlie', expected: 1000, status: 'PENDING' as const, actualAmount: null },
  ]
  for (const s of m2Settlements) {
    await prisma.settlement.create({
      data: {
        meetingId: meeting2.id,
        userId: userMap[s.name],
        expectedAmount: s.expected,
        actualAmount: s.actualAmount,
        status: s.status,
        settledAt: s.status === 'SETTLED' ? new Date() : null,
        settledBy: s.status === 'SETTLED' ? adminId : null,
        submittedAt: s.status === 'SUBMITTED' || s.status === 'SETTLED' ? new Date() : null,
      },
    })
  }

  await prisma.meeting.update({
    where: { id: meeting2.id },
    data: { status: 'CALCULATED' },
  })

  // ─── Meeting 3: Lunch (upcoming, OPEN) ───────────────────────────────────
  console.log('\n🍱 Creating Meeting 3: Lunch...')
  const meeting3 = await prisma.meeting.create({
    data: {
      title: 'Lunch at Town',
      date: new Date('2026-09-20T12:00:00'),
      location: 'Town Restaurant',
      status: 'OPEN',
      createdBy: adminId,
    },
  })

  for (const name of Object.keys(userMap).filter(n => n !== 'Admin')) {
    await prisma.meetingAttendee.create({
      data: { meetingId: meeting3.id, userId: userMap[name] },
    })
  }

  // Notifications
  console.log('\n🔔 Creating sample notifications...')
  const aliceId = userMap['Alice']
  await prisma.notification.create({
    data: {
      userId: aliceId,
      meetingId: meeting2.id,
      type: 'PAYMENT_SUBMITTED',
      title: 'Payment Submitted',
      message: 'Your payment for Beach Trip has been submitted. Waiting for admin confirmation.',
      read: false,
    },
  })

  console.log('\n✅ Seed complete!')
  console.log('\n📋 Dev Mode — You are auto-logged in as Admin')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('No login needed! DEV_MODE is enabled.')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
