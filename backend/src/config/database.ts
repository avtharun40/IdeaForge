import dns from 'node:dns';
import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('CRITICAL ERROR: MONGODB_URI environment variable is missing.');
    process.exit(1);
  }

  try {
    mongoose.set('strictQuery', true);
    dns.setServers(['8.8.8.8', '8.8.4.4']);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000
    });
    console.log('MongoDB successfully connected.');
  } catch (error) {
    console.error('CRITICAL ERROR: Failed to connect to MongoDB database:', error);
    throw error;
  }
};
