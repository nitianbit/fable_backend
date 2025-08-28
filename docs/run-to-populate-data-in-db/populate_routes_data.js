const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Load the models
const { 
  User,
  Bus, 
  BusType, 
  BusLayout,
  Route, 
  RouteStop, 
  BusSchedule, 
  BusScheduleLocation,
  Location
} = require('../../src/models');

// Database connection
const connectDB = async () => {
  try {
    // Set strictQuery to suppress deprecation warning
    mongoose.set('strictQuery', false);
    
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

// Function to populate all route-related data
const populateRoutesData = async () => {
  try {
    // Connect to database
    await connectDB();

    // Read sample routes data
    const routesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sample_routes_data.json'), 'utf8')
    );
    
    // Read sample locations data to get location IDs
    const locationsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'sample_locations.json'), 'utf8')
    );
    
    // Find Delhi and Dehradun locations
    const delhiLocation = await Location.findOne({ city: "Delhi" });
    const dehradunLocation = await Location.findOne({ city: "Dehradun" });
    
    if (!delhiLocation || !dehradunLocation) {
      console.error("Delhi or Dehradun location not found in database. Please run populate-locations first.");
      process.exit(1);
    }
    
    console.log(`Found Delhi location: ${delhiLocation.title}`);
    console.log(`Found Dehradun location: ${dehradunLocation.title}`);

    // Check if we already have required reference data
    let busType = await BusType.findOne({ name: "AC_SEATER" });
    if (!busType) {
      // Create a sample bus type
      busType = await BusType.create({
        name: "AC_SEATER",
        status: true
      });
      console.log(`Created BusType: ${busType.name}`);
    }

    let busLayout = await BusLayout.findOne({ name: "Standard Layout" });
    if (!busLayout) {
      // Create a sample bus layout
      busLayout = await BusLayout.create({
        name: "Standard Layout",
        max_seats: "40",
        layout: "layout-1",
        seat_numbers: "A1,B1,C1,D1,E1,F1,G1,H1,I1,J1,K1,L1,M1,N1,O1,P1,Q1,R1,S1,T1,U1,V1,W1,X1,Y1,Z1",
        status: true
      });
      console.log(`Created BusLayout: ${busLayout.name}`);
    }

    let adminUser = await User.findOne({ email: "admin@example.com" });
    if (!adminUser) {
      // Create a sample admin user
      adminUser = await User.create({
        firstname: "Admin",
        lastname: "User",
        email: "admin@example.com",
        phone: "9876543210",
        password: "Admin@123",
        status: true
      });
      console.log(`Created Admin User: ${adminUser.email}`);
    }

    // Clear existing route-related data (optional)
    // await Bus.deleteMany({});
    // await Route.deleteMany({});
    // await RouteStop.deleteMany({});
    // await BusSchedule.deleteMany({});
    // await BusScheduleLocation.deleteMany({});
    
    // Create buses
    const bus1 = await Bus.create({
      ...routesData.buses[0],
      adminId: adminUser._id,
      bustypeId: busType._id,
      buslayoutId: busLayout._id
    });
    
    const bus2 = await Bus.create({
      ...routesData.buses[1],
      adminId: adminUser._id,
      bustypeId: busType._id,
      buslayoutId: busLayout._id
    });
    
    console.log(`Created buses: ${bus1.name}, ${bus2.name}`);
    
    // Create routes
    const route1 = await Route.create({
      ...routesData.routes[0],
      locationId: delhiLocation._id,
      busId: bus1._id,
      adminId: adminUser._id
    });
    
    const route2 = await Route.create({
      ...routesData.routes[1],
      locationId: dehradunLocation._id,
      busId: bus2._id,
      adminId: adminUser._id
    });
    
    console.log(`Created routes: ${route1.title}, ${route2.title}`);
    
    // Create route stops
    const routeStop1 = await RouteStop.create({
      ...routesData.route_stops[0],
      routeId: route1._id,
      stopId: delhiLocation._id
    });
    
    const routeStop2 = await RouteStop.create({
      ...routesData.route_stops[1],
      routeId: route1._id,
      stopId: dehradunLocation._id
    });
    
    const routeStop3 = await RouteStop.create({
      ...routesData.route_stops[2],
      routeId: route2._id,
      stopId: dehradunLocation._id
    });
    
    const routeStop4 = await RouteStop.create({
      ...routesData.route_stops[3],
      routeId: route2._id,
      stopId: delhiLocation._id
    });
    
    console.log(`Created ${routesData.route_stops.length} route stops`);
    
    // Create bus schedules
    const busSchedule1 = await BusSchedule.create({
      ...routesData.bus_schedules[0],
      routeId: route1._id,
      busId: bus1._id
    });
    
    const busSchedule2 = await BusSchedule.create({
      ...routesData.bus_schedules[1],
      routeId: route1._id,
      busId: bus1._id
    });
    
    const busSchedule3 = await BusSchedule.create({
      ...routesData.bus_schedules[2],
      routeId: route2._id,
      busId: bus2._id
    });
    
    console.log(`Created ${routesData.bus_schedules.length} bus schedules`);
    
    // Create bus schedule locations
    const busScheduleLocation1 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[0],
      busScheduleId: busSchedule1._id,
      stopId: delhiLocation._id
    });
    
    const busScheduleLocation2 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[1],
      busScheduleId: busSchedule1._id,
      stopId: dehradunLocation._id
    });
    
    const busScheduleLocation3 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[2],
      busScheduleId: busSchedule2._id,
      stopId: delhiLocation._id
    });
    
    const busScheduleLocation4 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[3],
      busScheduleId: busSchedule2._id,
      stopId: dehradunLocation._id
    });
    
    const busScheduleLocation5 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[4],
      busScheduleId: busSchedule3._id,
      stopId: dehradunLocation._id
    });
    
    const busScheduleLocation6 = await BusScheduleLocation.create({
      ...routesData.bus_schedule_locations[5],
      busScheduleId: busSchedule3._id,
      stopId: delhiLocation._id
    });
    
    console.log(`Created ${routesData.bus_schedule_locations.length} bus schedule locations`);
    
    // Close database connection
    mongoose.connection.close();
    
    console.log('Database connection closed');
    console.log('Successfully populated all route data!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Run the function
populateRoutesData();