// src/utils/bootstrapAdmin.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";

export async function ensureBootstrapAdmin() {
  try {
    // 🧠 Skip in production
    if (process.env.NODE_ENV === "production") {
      console.log("⚙️ Skipping bootstrap admin creation (running in production)");
      return;
    }

    const existing = await User.findOne({ role: "siteAdmin" });
    if (!existing) {
      const password = await bcrypt.hash("Admin123!", 10);
      const newUser = await User.create({
        firstName: "Default",
        lastName: "Admin",
        email: "admin@dominionconnect.org",
        password,
        role: "siteAdmin",
        isActive: true,
      });

      console.log("🟢 Default Site Admin created:");
      console.log("   Email: admin@dominionconnect.org");
      console.log("   Password: Admin123!");

      // Generate JWT for quick local testing
      const token = jwt.sign(
        { id: newUser._id, role: "siteAdmin" },
        process.env.JWT_SECRET!,
        { expiresIn: "1d" }
      );
      console.log(`🔑 Temporary JWT Token: ${token}`);
    } else {
      console.log("✅ Site Admin already exists — skipping bootstrap");
    }
  } catch (error) {
    console.error("❌ Error creating bootstrap admin:", error);
  }
}
