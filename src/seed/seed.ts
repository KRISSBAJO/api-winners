import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Member from '../models/Member';
import Church from '../models/Church';
import Event from '../models/Event';

dotenv.config();

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || '');

    await User.deleteMany({});
    await Member.deleteMany({});
    await Church.deleteMany({});
    await Event.deleteMany({});

    const church = await Church.create({
      churchId: 'WCN001',
      name: 'Winners Chapel Nashville',
      address: '123 Main St, Nashville, TN',
      location: 'Nashville',
      contactEmail: 'info@wcn.org',
      createdBy: 'system',
    });

    const user = await User.create({
      name: 'Site Admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'siteAdmin'
    });

    const churchAdmin = await User.create({
      name: 'Church Admin',
      email: 'churchadmin@example.com',
      password: 'password123',
      role: 'churchAdmin',
      churchId: church.churchId,
    });

    const member = await Member.create({
      churchId: church.churchId,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      status: 'Active',
      roles: ['Member']
    });

    const event = await Event.create({
      churchId: church.churchId,
      title: 'Sunday Service',
      description: 'Weekly Sunday worship service',
      startDate: new Date(),
      endDate: new Date(),
      location: 'Main Sanctuary',
      createdBy: churchAdmin._id.toString(),
    });

    console.log('✅ Seeding complete');
    process.exit();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

seed();
