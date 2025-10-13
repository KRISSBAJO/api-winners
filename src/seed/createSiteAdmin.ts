// src/seed/createSiteAdmin.ts
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

async function main() {
  const {
    MONGO_URI,
    BOOTSTRAP_ADMIN_EMAIL = 'admin@dominionconnect.org',
    BOOTSTRAP_ADMIN_PASSWORD = 'Admin123!',
    BOOTSTRAP_ADMIN_FIRST = 'Default',
    BOOTSTRAP_ADMIN_LAST = 'Admin',
  } = process.env;

  if (!MONGO_URI) throw new Error('MONGO_URI not set');

  await mongoose.connect(MONGO_URI);

  const existing = await User.findOne({ role: 'siteAdmin' });
  if (existing) {
    console.log('✅ Site Admin already exists:', existing.email);
    await mongoose.disconnect();
    return;
  }

  const password = await bcrypt.hash(BOOTSTRAP_ADMIN_PASSWORD, 10);
  const created = await User.create({
    firstName: BOOTSTRAP_ADMIN_FIRST,
    lastName: BOOTSTRAP_ADMIN_LAST,
    email: BOOTSTRAP_ADMIN_EMAIL,
    password,
    role: 'siteAdmin',
    isActive: true,
  });

  console.log('🟢 Site Admin created');
  console.log('   Email:', created.email);
  console.log('   Temp Password:', BOOTSTRAP_ADMIN_PASSWORD);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('❌ Failed:', e);
  await mongoose.disconnect();
  process.exit(1);
});
