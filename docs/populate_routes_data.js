const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load the models
const { 
  Bus, 
  Route, 
  RouteStop, 
  BusSchedule, 
  BusScheduleLocation 
} = require('./src/models');

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

// Function to populate routes data
const populateRoutesData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Read sample routes data
    const routesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sample_routes_data.json'), 'utf8')
    );

    // Clear existing route-related data (optional)
    // await Bus.deleteMany({});
    // await Route.deleteMany({});
    // await RouteStop.deleteMany({});
    // await BusSchedule.deleteMany({});
    // await BusScheduleLocation.deleteMany({});
    
    // Insert buses data
    const insertedBuses = await Bus.insertMany(routesData.buses);
    console.log(`Successfully inserted ${insertedBuses.length} buses`);
    
    // Insert routes data
    const insertedRoutes = await Route.insertMany(routesData.routes);
    console.log(`Successfully inserted ${insertedRoutes.length} routes`);
    
    // Insert route stops data
    const insertedRouteStops = await RouteStop.insertMany(routesData.route_stops);
    console.log(`Successfully inserted ${insertedRouteStops.length} route stops`);
    
    // Insert bus schedules data
    const insertedBusSchedules = await BusSchedule.insertMany(routesData.bus_schedules);
    console.log(`Successfully inserted ${insertedBusSchedules.length} bus schedules`);
    
    // Insert bus schedule locations data
    const insertedBusScheduleLocations = await BusScheduleLocation.insertMany(routesData.bus_schedule_locations);
    console.log(`Successfully inserted ${insertedBusScheduleLocations.length} bus schedule locations`);
    
    // Close database connection
    mongoose.connection.close();
    
    console.log('Database connection closed');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the function
populateRoutesData();