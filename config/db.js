import mongoose from 'mongoose';

const dbconnect = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log(' DB is connected');
  } catch (err) {
    console.error('DB connection failed:', err);
  }
};

export default dbconnect;
