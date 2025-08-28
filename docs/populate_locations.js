const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load the Location model
const { Location } = require('./src/models');

// Database connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/fable_backend', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Function to populate locations
const populateLocations = async () => {
  try {
    // Connect to database
    await connectDB();

    // Read sample locations data
    const locationsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sample_locations.json'), 'utf8')
    );

    // Clear existing locations (optional)
    // await Location.deleteMany({});
    
    // Insert locations data
    const insertedLocations = await Location.insertMany(locationsData);
    
    console.log(`Successfully inserted ${insertedLocations.length} locations`);
    
    // Close database connection
    mongoose.connection.close();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the function
populateLocations();