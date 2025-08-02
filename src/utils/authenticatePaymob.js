const { paymentGateway } = require("./utils");
const axios = require("axios");
const { createHmac } = require("crypto");

// Authenticate with Paymob to get an access token
async function authenticate(name) {
  try {
    const PAYMOB_URL = "https://accept.paymob.com/api";
    const paymobGateway = await paymentGateway(name);
    const API_TOKEN = paymobGateway.key
      ? paymobGateway.key
      : process.env.PAY_API;
    const PASSWORD = paymobGateway.password
      ? paymobGateway.password
      : process.env.PASSWORD;
    const USERNAME = paymobGateway.username
      ? paymobGateway.username
      : process.env.USER_NAME;
    const url = `${PAYMOB_URL}/auth/tokens`;
    const headers = {
      "Content-Type": "application/json",
    };
    const data = {
      api_key: API_TOKEN,
      username: USERNAME,
      password: PASSWORD,
    };
    const response = await axios.post(url, data, { headers });
    const accessToken = response.data.token;
    return {
      accessToken,
      integrationId: paymobGateway.integration_id,
      frameId: paymobGateway.frame_id,
    };
  } catch (error) {
    console.error("Error authenticating:", error.response);
  }
}

async function hmacValidate(request_type, paymentObj) {
  try {
    let {
      success,
      pending,
      owner,
      order,
      is_voided,
      is_refunded,
      is_capture,
      is_auth,
      is_3d_secure,
      integration_id,
      id,
      amount_cents,
      created_at,
      currency,
      error_occured,
      has_parent_transaction,
      is_standalone_payment,
    } = paymentObj;

    // Create a lexogragical string with the order specified by Paymob @ https://docs.paymob.com/docs/hmac-calculation
    let lexogragical =
      amount_cents +
      created_at +
      currency +
      error_occured +
      has_parent_transaction +
      id +
      integration_id +
      is_3d_secure +
      is_auth +
      is_capture +
      is_refunded +
      is_standalone_payment +
      is_voided;


    if (request_type === "GET") {
      lexogragical +=
        order +
        owner +
        pending +
        paymentObj["source_data.pan"] +
        paymentObj["source_data.sub_type"] +
        paymentObj["source_data.type"] +
        success;
    } else if (request_type === "POST") {
      // Create a lexogragical string with the order specified by Paymob @ https://docs.paymob.com/docs/hmac-calculation
      lexogragical +=
        order +
        owner +
        pending +
        paymentObj.source_data.pan +
        paymentObj.source_data.sub_type +
        paymentObj.source_data.type +
        success;
    }

    const getpaymobGateway = await paymentGateway("Paymob");
    const hmacKey = getpaymobGateway.secret;
    // Create a hash using the lexogragical string and the HMAC key
    let hash = createHmac("sha512", hmacKey) //"F1FB72E75CDAEA3F9A7AE1B86D9740C0"
      .update(lexogragical)
      .digest("hex");
    return hash;
  } catch (error) {
    return "";
  }
}
module.exports = { authenticate, hmacValidate };
