require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/newGenerationPools';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get credentials from environment or use defaults
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ username });
    
    if (existingAdmin) {
      console.log(`Admin user '${username}' already exists. Updating password...`);
      existingAdmin.password = password;
      await existingAdmin.save();
      console.log(`✓ Admin user '${username}' password updated successfully`);
    } else {
      // Create new admin user
      const adminUser = new User({
        username,
        password // Will be automatically hashed by pre-save hook
      });
      await adminUser.save();
      console.log(`✓ Admin user '${username}' created successfully`);
    }

    console.log('\nLogin credentials:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log('\nAdmin user ready!');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin user:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

createAdmin();

