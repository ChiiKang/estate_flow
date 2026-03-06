import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding database...")

  // Create org
  const org = await prisma.org.create({
    data: {
      name: "Skyline Properties Sdn Bhd",
    },
  })

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12)
  const admin = await prisma.user.create({
    data: {
      orgId: org.id,
      name: "Admin User",
      email: "admin@estateflow.dev",
      password: hashedPassword,
      role: "ADMIN",
    },
  })

  // Create agent user
  const agentPassword = await bcrypt.hash("agent123", 12)
  const agent = await prisma.user.create({
    data: {
      orgId: org.id,
      name: "Sarah Tan",
      email: "sarah@estateflow.dev",
      password: agentPassword,
      role: "AGENT",
    },
  })

  // Create manager
  const managerPassword = await bcrypt.hash("manager123", 12)
  const manager = await prisma.user.create({
    data: {
      orgId: org.id,
      name: "Ahmad Rahman",
      email: "ahmad@estateflow.dev",
      password: managerPassword,
      role: "MANAGER",
    },
  })

  // Create projects
  const project1 = await prisma.project.create({
    data: {
      orgId: org.id,
      name: "The Maple Residences",
      location: "Bangsar South, KL",
      status: "ACTIVE",
    },
  })

  const project2 = await prisma.project.create({
    data: {
      orgId: org.id,
      name: "Horizon Tower",
      location: "Mont Kiara, KL",
      status: "ACTIVE",
    },
  })

  // Create units for project 1
  const unitTypes = ["Studio", "1BR", "2BR", "3BR"]
  const facings = ["North", "South", "East", "West"]
  const units = []

  for (let floor = 1; floor <= 5; floor++) {
    for (let unit = 1; unit <= 4; unit++) {
      const unitType = unitTypes[unit - 1]
      const size = unitType === "Studio" ? 450 : unitType === "1BR" ? 650 : unitType === "2BR" ? 900 : 1200
      const price = size * 1200

      const u = await prisma.unit.create({
        data: {
          orgId: org.id,
          projectId: project1.id,
          tower: "Tower A",
          floor: String(floor),
          unitNo: `A-${floor}${String(unit).padStart(2, "0")}`,
          unitType,
          sizeSqm: size / 10.764, // sqft to sqm
          facing: facings[unit - 1],
          basePrice: price,
          currentPrice: price,
          status: floor <= 2 && unit <= 2 ? "SOLD" : floor <= 3 && unit <= 3 ? "BOOKED" : "AVAILABLE",
        },
      })
      units.push(u)
    }
  }

  // Create units for project 2
  for (let floor = 1; floor <= 3; floor++) {
    for (let unit = 1; unit <= 3; unit++) {
      const unitType = unitTypes[unit]
      const size = unitType === "1BR" ? 700 : unitType === "2BR" ? 950 : 1300
      const price = size * 1400

      await prisma.unit.create({
        data: {
          orgId: org.id,
          projectId: project2.id,
          tower: "Tower B",
          floor: String(floor),
          unitNo: `B-${floor}${String(unit).padStart(2, "0")}`,
          unitType,
          sizeSqm: size / 10.764,
          facing: facings[unit - 1],
          basePrice: price,
          currentPrice: price,
          status: floor === 1 ? "RESERVED" : "AVAILABLE",
        },
      })
    }
  }

  // Create leads
  const leadData = [
    { name: "Lim Wei Jie", phoneRaw: "0121234567", phoneE164: "+60121234567", email: "weijie@email.com", source: "Website", stage: "NEW" as const },
    { name: "Nurul Aisyah", phoneRaw: "0139876543", phoneE164: "+60139876543", email: "nurul@email.com", source: "Walk-in", stage: "CONTACTED" as const },
    { name: "Rajesh Kumar", phoneRaw: "0167778899", phoneE164: "+60167778899", email: "rajesh@email.com", source: "Referral", stage: "QUALIFIED" as const },
    { name: "Tan Mei Ling", phoneRaw: "0111234567", phoneE164: "+60111234567", email: "meiling@email.com", source: "Facebook", stage: "SITE_VISIT" as const },
    { name: "David Wong", phoneRaw: "0123456789", phoneE164: "+60123456789", email: "david.wong@email.com", source: "Website", stage: "UNIT_SELECTED" as const },
    { name: "Siti Fatimah", phoneRaw: "0145556677", phoneE164: "+60145556677", email: "siti.f@email.com", source: "Instagram", stage: "NEW" as const },
  ]

  const leads = []
  for (const ld of leadData) {
    const lead = await prisma.lead.create({
      data: {
        orgId: org.id,
        projectId: project1.id,
        ownerUserId: ld.stage === "NEW" ? null : agent.id,
        name: ld.name,
        phoneRaw: ld.phoneRaw,
        phoneE164: ld.phoneE164,
        email: ld.email,
        source: ld.source,
        stage: ld.stage,
        priority: ld.stage === "UNIT_SELECTED" ? 2 : ld.stage === "QUALIFIED" ? 1 : 0,
      },
    })
    leads.push(lead)
  }

  // Create deals
  const deal1 = await prisma.deal.create({
    data: {
      orgId: org.id,
      projectId: project1.id,
      unitId: units[0].id,
      leadId: leads[4].id,
      assignedUserId: agent.id,
      stage: "BOOKED",
      pricing: { spaPrice: 540000, discount: 0, netPrice: 540000 },
    },
  })

  const deal2 = await prisma.deal.create({
    data: {
      orgId: org.id,
      projectId: project1.id,
      unitId: units[1].id,
      leadId: leads[2].id,
      assignedUserId: agent.id,
      stage: "RESERVED",
      pricing: { spaPrice: 780000, discount: 10000, netPrice: 770000 },
    },
  })

  // Create tasks
  const now = new Date()
  await prisma.task.createMany({
    data: [
      {
        orgId: org.id,
        leadId: leads[1].id,
        assignedUserId: agent.id,
        type: "CALL",
        title: "Follow up call with Nurul",
        dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
        status: "OPEN",
      },
      {
        orgId: org.id,
        leadId: leads[3].id,
        assignedUserId: agent.id,
        type: "SITE_VISIT",
        title: "Site visit with Tan Mei Ling",
        dueAt: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000),
        status: "OPEN",
      },
      {
        orgId: org.id,
        dealId: deal1.id,
        assignedUserId: agent.id,
        type: "DOC_REQUEST",
        title: "Collect IC copy from David Wong",
        dueAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        status: "OPEN",
      },
      {
        orgId: org.id,
        leadId: leads[0].id,
        assignedUserId: agent.id,
        type: "WHATSAPP",
        title: "Send project brochure to Lim Wei Jie",
        dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: "OPEN",
      },
    ],
  })

  // Create payments
  await prisma.payment.create({
    data: {
      orgId: org.id,
      dealId: deal1.id,
      type: "BOOKING_FEE",
      amount: 10000,
      paidAt: new Date(),
      referenceNo: "PAY-001",
      status: "VERIFIED",
    },
  })

  // Create message templates
  await prisma.messageTemplate.createMany({
    data: [
      {
        orgId: org.id,
        projectId: project1.id,
        name: "Welcome Message",
        content: "Hi {{name}}, thank you for your interest in {{project}}! I'm {{agent_name}}, your dedicated property consultant. How can I help you today?",
      },
      {
        orgId: org.id,
        projectId: project1.id,
        name: "Site Visit Invitation",
        content: "Hi {{name}}, would you like to visit {{project}} this weekend? We have exclusive units available. Reply YES to schedule a viewing!",
      },
      {
        orgId: org.id,
        name: "Follow-up",
        content: "Hi {{name}}, just checking in! Have you had a chance to review the unit details I sent? Happy to answer any questions.",
      },
    ],
  })

  // Create activities
  await prisma.activity.createMany({
    data: [
      {
        orgId: org.id,
        entityType: "LEAD",
        entityId: leads[4].id,
        type: "CREATED",
        data: { name: "David Wong" },
        actorUserId: agent.id,
      },
      {
        orgId: org.id,
        entityType: "DEAL",
        entityId: deal1.id,
        type: "CREATED",
        data: { leadName: "David Wong", unitNo: units[0].unitNo },
        actorUserId: agent.id,
      },
      {
        orgId: org.id,
        entityType: "DEAL",
        entityId: deal1.id,
        type: "STAGE_CHANGE",
        data: { from: "RESERVED", to: "BOOKED" },
        actorUserId: agent.id,
      },
      {
        orgId: org.id,
        entityType: "DEAL",
        entityId: deal1.id,
        type: "PAYMENT_SUBMITTED",
        data: { amount: 10000, type: "BOOKING_FEE" },
        actorUserId: agent.id,
      },
    ],
  })

  console.log("Seed complete!")
  console.log("---")
  console.log("Admin: admin@estateflow.dev / admin123")
  console.log("Agent: sarah@estateflow.dev / agent123")
  console.log("Manager: ahmad@estateflow.dev / manager123")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
