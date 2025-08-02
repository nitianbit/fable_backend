const admin = require("firebase-admin");
const { Setting } = require("../models");

let initializedApp = null;

const firebaseAdmin = async () => {
  try {
    const getSetting = await Setting.findOne({}, "notifications");
    
    // Only initialize if settings are available
    if (
      getSetting &&
      getSetting.notifications.firebase_database_url &&
      getSetting.notifications.firebase_credential
    ) {
      const firebase_database_url = getSetting.notifications.firebase_database_url;
      const firebase_credential = getSetting.notifications.firebase_credential;

      // Check if Firebase is already initialized
      if (!initializedApp) {
        admin.initializeApp({
          credential: admin.credential.cert(firebase_credential),
          databaseURL: firebase_database_url,
        });
        initializedApp = admin;
      }
    } else {
      console.error("Missing Firebase credentials or database URL");
    }
  } catch (err) {
    console.error("Error initializing Firebase:", err);
  }
};

firebaseAdmin();

const UserNotification = async (title, message, data, token) => {
  try {
    let messagePayload;
    if (typeof data === "object") {
		
      messagePayload = {
		token: token,
        data: {
          title,
          message,
          data: JSON.stringify(data), // Ensuring data is a string or serialized
        },
      };
    } else {
      messagePayload = {
		token: token,
        data: {
          title,
          message,
        },
      };
    }
	
    // Make sure Firebase Admin is initialized before sending notifications
    if (initializedApp) {
      const response = await initializedApp.messaging().send(messagePayload);
      return response;
    } else {
      throw new Error("Firebase Admin is not initialized.");
    }
  } catch (err) {
    console.error("Error sending notification:", err);
    throw err;  // Propagate error for better debugging
  }
};

module.exports = {
  UserNotification,
};
