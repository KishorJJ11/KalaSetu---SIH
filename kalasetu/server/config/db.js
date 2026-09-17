const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kalasetu';

  mongoose.set('strictQuery', true);

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(`[KalaSetu] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error(`[KalaSetu] MongoDB connection error: ${err.message}`);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[KalaSetu] MongoDB disconnected. Attempting to reconnect handled by driver.');
  });
};

module.exports = connectDB;
