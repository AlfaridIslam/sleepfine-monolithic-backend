import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../src/config/index.js';

const uri = config.database?.uri || 'mongodb://localhost:27017/sleepfineCRM_DEV';

async function setPassword() {
  await mongoose.connect(uri);
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('Admin@123', salt);
  
  const res = await mongoose.connection.collection('admins').updateOne(
    { email: 'admin@sleepfine.com' },
    { $set: { password: hash, loginAttempts: 0, lockUntil: null } }
  );
  
  console.log('Result:', res);
  console.log('Password for admin@sleepfine.com is now Admin@123');
  await mongoose.disconnect();
}

setPassword().catch(console.error);
