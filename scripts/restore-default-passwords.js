import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../src/config/index.js';

const uri = config.database?.uri || 'mongodb://localhost:27017/sleepfineCRM_DEV';

const accounts = [
  { collection: 'admins', email: 'admin@sleepfine.com', password: 'Admin@123' },
  { collection: 'salesmen', email: 'john@salesman.com', password: 'Sales@123' },
  { collection: 'accountants', email: 'jane@accountant.com', password: 'Account@123' },
  { collection: 'logistics', email: 'mike@logistics.com', password: 'Logistics@123' },
  { collection: 'drivers', email: 'driver@sleepfine.com', password: 'Driver@123' },
];

async function restorePasswords() {
  await mongoose.connect(uri);
  console.log(`Connected to database: ${mongoose.connection.name}`);

  for (const acc of accounts) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(acc.password, salt);

    const res = await mongoose.connection.collection(acc.collection).updateOne(
      { email: acc.email },
      { $set: { password: hash, loginAttempts: 0, lockUntil: null } }
    );

    console.log(`[${acc.collection}] ${acc.email} -> password set to: ${acc.password} (matched: ${res.matchedCount}, modified: ${res.modifiedCount})`);
  }

  await mongoose.disconnect();
  console.log('All default passwords restored successfully!');
}

restorePasswords().catch(console.error);
