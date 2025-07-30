const bcrypt = require("bcryptjs")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

async function seedAdminUser() {
  try {
    console.log("🌱 Seeding admin user...")

    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: "admin@manufacturing.com" }
    })

    if (existingAdmin) {
      console.log("✅ Admin user already exists")
      return
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash("Manu123", 12)

    // Create admin user
    const adminUser = await prisma.user.create({
      data: {
        email: "admin@manufacturing.com",
        name: "Admin User",
        role: "admin",
        password: hashedPassword,
        permissions: [
          "materials",
          "processes", 
          "routings",
          "finishes",
          "margins",
          "features",
          "versions",
          "dashboard"
        ],
        disabled: false,
        version: 1,
      }
    })

    console.log("✅ Admin user created successfully:")
    console.log("📧 Email: admin@manufacturing.com")
    console.log("🔑 Password: Manu123")
    console.log("👤 ID:", adminUser.id)

  } catch (error) {
    console.error("❌ Error seeding admin user:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedAdminUser().catch((error) => {
  console.error(error)
  process.exit(1)
})