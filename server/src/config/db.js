import mongoose from 'mongoose';
import dns from 'dns';

// Fix Windows SRV DNS resolution issues for MongoDB Atlas cluster
dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      maxPoolSize: 10,
    });
    console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error(`⚠️ MongoDB Atlas Connection Error: ${error.message}. Running in local offline mode.`);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB Atlas disconnected. Attempting automatic reconnection...');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB Atlas reconnected successfully!');
});
