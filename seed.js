require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/newGenerationPools';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username: 'admin' });
    
    if (existingAdmin) {
      console.log('Admin user already exists. Updating password...');
      // Update password (will be hashed by pre-save hook)
      existingAdmin.password = 'admin123';
      await existingAdmin.save();
      console.log('✓ Admin user password updated successfully');
    } else {
      // Create new admin user
      const adminUser = new User({
        username: 'admin',
        password: 'admin123' // Will be automatically hashed by pre-save hook
      });
      await adminUser.save();
      console.log('✓ Admin user created successfully');
    }

    console.log('\nLogin credentials:');
    console.log('Username: admin');
    console.log('Password: admin123');
    console.log('\nDatabase seeded successfully!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seedDatabase();

