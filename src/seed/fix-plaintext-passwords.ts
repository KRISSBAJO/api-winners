// scripts/fix-plaintext-passwords.ts
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User";

if (!process.env.MONGO_URI) {
  console.error("MONGO_URI not set in environment");
  process.exit(1);
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI!);

  const cursor = User.find({}).cursor();
  let fixed = 0;

  for await (const u of cursor) {
    if (typeof u.password === "string" && !u.password.startsWith("$2")) {
      u.password = await bcrypt.hash(u.password, 10);
      await u.save(); // triggers hooks anyway, but we already hashed
      fixed++;
    }
  }

  console.log(`Done. Fixed ${fixed} user(s).`);
  process.exit(0);
})();
