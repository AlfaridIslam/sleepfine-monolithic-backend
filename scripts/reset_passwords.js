import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import config from '../src/config/index.js';

const uri = config.database?.uri || process.env.MONGODB_URI || 'mongodb://localhost:27017/sleepfineCRM_DEV';

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    
    // Create hash for "password123"
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash('password123', salt);
    
    const collectionsToSearch = ['admins', 'salesmen', 'logistics', 'accountants', 'drivers', 'users'];
    const db = client.db();
    
    console.log(`\n=== Resetting Passwords in Database: ${db.databaseName} ===`);
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    
    for (const colName of collectionsToSearch) {
      if (collectionNames.includes(colName)) {
        const result = await db.collection(colName).updateMany(
          {}, 
          { $set: { password: newPasswordHash, loginAttempts: 0, lockUntil: null } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`-- Collection [${colName}]: Updated ${result.modifiedCount} accounts to use 'password123' --`);
        }
      }
    }
    
    console.log("\nPassword reset complete! All test accounts now use the password: password123");
  } catch (error) {
    console.error("Error resetting passwords:", error);
  } finally {
    await client.close();
  }
}

run().catch(console.dir);
