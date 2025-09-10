const express = require('express');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve('public/users/profile'));
    },
    filename: function (re, file, cb) {
        cb(null, new Date().toISOString().replace(/:/g, '-') + file.originalname);
    }
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png') {
        cb(null, true);
    } else {
        cb(new Error('Wrong file type'), false);
    }
}
const upload = multer({ storage: storage, fileFilter: fileFilter });

const { authenticate } = require('../middleware/authenticate');
const { csrfCheck } = require('../middleware/csrfCheck');
const { initSession, isEmail } = require('../utils/utils');


const userController = require("../controllers/users/index.controller");
const notificationController = require("../controllers/users/notification.controller");
const UserModel = require('../models/User.model');
const router = express.Router();

router.post('/register', userController.register);   //done. // understanding done 


router.post('/refresh-token', userController.refresh);    //done.  // understanding done


router.post('/help', authenticate, userController.help);     // pending : what is helpmail and contact number

router.post('/verify', authenticate, userController.verifyOTP);  // done // done and added some changes 
 
router.post('/re-send', authenticate, userController.reSendOTP);   // done // checked

router.get('/refercode', authenticate, userController.referral);  // done. // done and done some changes too

router.get('/referlink', authenticate, userController.referlink);  // done

router.post('/apply-referral', authenticate, userController.applyReferral);  // done

router.post('/addmoney', authenticate, userController.addmoney);  // done , razorPay pending
router.post('/payment/verify', authenticate, userController.verifypayment);   // razorPay pending

router.post('/referrallink/:referral', authenticate, userController.referrallink);  // done

router.get('/walletcheck', authenticate, userController.walletcheck);    // done

router.get('/wallet-transactions', authenticate, userController.wallettransactions);  //done

router.get('/booking-transactions', authenticate, userController.bookingTransactions);  // done

router.post('/updateuser', authenticate, upload.single('ProfilePic'), userController.updateuser); // done

router.post("/update-language", authenticate, userController.updateLang);  // pending


router.post('/booking', userController.book); //pending

router.get('/me', authenticate, userController.findProfile);   // done

router.delete('/me', authenticate, csrfCheck, userController.userDelete);   // done 

router.post('/searchlocation', authenticate, userController.searchlocation);

router.put('/logout', authenticate, csrfCheck, userController.logout);  

router.post('/my-trips', authenticate, userController.getTrips)

router.post('/trip-qr', authenticate, userController.generateQRTrip)


router.post('/add-update-office-and-home', authenticate, userController.addHomeOffice)


router.post('/trip-track', authenticate, userController.track)

router.get('/invoice/:pnr_no', userController.invoiceGenerate)


/**** notifications***/

router.get("/notification/lists", authenticate, notificationController.lists);
router.get("/notification/clear-all",authenticate,notificationController.clearAll);



module.exports = router;