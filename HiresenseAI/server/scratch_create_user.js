import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './src/models/User.model.js';

dotenv.config();

const createTestUser = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-agent-interview');
    
    const email = 'test@example.com';
    const existing = await User.findOne({ email });
    
    if (existing) {
      console.log('Test user already exists.');
    } else {
      const hashedPassword = await bcrypt.hash('Test1234', 10);
      await User.create({
        name: 'Test User',
        email: email,
        password: hashedPassword
      });
      console.log('Test user created successfully!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
};

createTestUser();
