const express = require('express');
const path = require("path");
const bodyParser = require('body-parser');
require('dotenv').config({ path: __dirname + '/.env' });
const mongoose = require('./src/config/db');

//process.env.TZ = "Asia/Kolkata";

const { getSecret } = require('./src/config/db');
const routes = require('./src/routes');
const scheduler = require('./src/scheduler');

// open mongoose connection
mongoose.connect();


const { Setting } = require("./src/models");

const app = express();
const port = process.env.PORT || 4000;

app.enable('trust proxy')

app.use(bodyParser.urlencoded({
    extended: true,
}));
app.use(bodyParser.json({
    limit: '4mb'
}));

app.use("/public", express.static(path.join(__dirname, "public")));

app.use((req,res,next) => {
	res.setHeader("Access-Control-Allow-Origin","*");
	res.setHeader(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization"
	);
	res.setHeader(
		"Access-Control-Allow-Methods",
		"GET, POST, PATCH, PUT, DELETE, OPTIONS"
	)
	next();
})

// Middleware to set the timezone value in the app.locals object
app.use(async (req, res, next) => {
	const getSetting = await Setting.getgeneral();
	if (getSetting) {
	  //app.locals.timezone = getSetting.general.timezone;
	  global.DEFAULT_TIMEZONE = getSetting.general.timezone;
	  global.DEFAULT_CURRENCY_CODE =getSetting.general.default_currency_code;
	  global.DEFAULT_DATEFORMAT = getSetting.general.date_format.value ? getSetting.general.date_format.value : 'DD MMM YYYY';
	  global.DEFAULT_TIMEFORMAT = getSetting.general.time_format.value ? getSetting.general.time_format.value : 'hh:mm A';
	  global.DEFAULT_CURRENCY =  getSetting.general.default_currency;
	  global.DEFAULT_APPNAME =  getSetting.general.name;
	  global.DEFAULT_LOGO =  getSetting.general.logo;
	  global.DEFAULT_EMAIL =  getSetting.general.email;
	  global.DEFAULT_ADDRESS =  getSetting.general.address;
	  global.MAX_DISTANCE = getSetting.general.max_distance
      ? getSetting.general.max_distance
      : 2000;
    global.PREBOOKING_MINUTE = getSetting.general.prebooking_time
      ? getSetting.general.prebooking_time
      : 30;
	}
	next();
  });


app.use("/api",routes) // routes api

app.get('/newtest', function(req, res){

	res.status(200).json({
	message:"welocome from API"
	})

})



app.listen(port, () => {

  scheduler.Trip.bookingCompletedTrip();
  scheduler.Trip.bookingExpiredTrip();
  scheduler.Payment.bookingPaymentCheck();

  let message = `Worker : ${process.pid} started`

    console.log(`Server running on port ${port}`);
});

module.exports = { app };