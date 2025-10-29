const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hardware-inventory');

    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const adminExists = await User.findOne({ email: 'admin@sanjayhardware.com' });
    
    if (adminExists) {
      console.log('⚠️  Admin user already exists!');
      console.log('Email:', adminExists.email);
      console.log('Role:', adminExists.role);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@sanjayhardware.com',
      password: 'admin123',
      role: 'admin',
      phone: '1234567890',
      isActive: true
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@sanjayhardware.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    process.exit(1);
  }
};

createAdminUser();

