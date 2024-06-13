import mongoose from 'mongoose';

const mongoURI = 'mongodb://localhost:27017/chatDB';

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useUnifiedTopology: true,
    } as mongoose.ConnectOptions);
    console.log('MongoDB connected...');
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error('An unknown error occurred');
    }
    process.exit(1);
  }
};

export default connectDB;