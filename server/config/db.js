import mongoose from 'mongoose';

/**
 * Connect to MongoDB database.
 * Tries MONGODB_URI first; if local MongoDB is not running,
 * automatically starts MongoMemoryServer so the app runs 100% out-of-the-box
 * for interviews, demos, and testing without requiring manual MongoDB installation.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/miniledger';

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500, // Quick fail if local mongo is down
    });
    console.log(`✅ MongoDB Connected (Local/Remote): ${conn.connection.host}`);
    return;
  } catch (err) {
    console.warn(`⚠️ Could not connect to MongoDB at ${uri} (${err.message}).`);
    console.log('🔄 Initializing in-memory MongoDB server for demo/interview mode...');

    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`🚀 Embedded MongoMemoryServer connected successfully!`);
      console.log(`   URI: ${memUri}`);
      console.log(`   The API is 100% functional and ready for testing & evaluation.`);
    } catch (memErr) {
      console.error(`❌ Critical Database Error: ${memErr.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
