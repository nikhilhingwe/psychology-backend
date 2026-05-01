import mongoose from 'mongoose';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const checkAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/psychology');
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@psychology.com' });
    
    if (admin) {
      console.log('Admin user found:');
      console.log('Email:', admin.email);
      console.log('Name:', admin.name);
      console.log('Is Admin:', admin.isAdmin);
      console.log('ID:', admin._id);
    } else {
      console.log('Admin user NOT found in database');
    }

    // List all users
    const allUsers = await User.find({});
    console.log('\nTotal users in database:', allUsers.length);
    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - isAdmin: ${user.isAdmin}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

checkAdmin();
