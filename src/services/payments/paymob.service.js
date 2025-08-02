const { authenticate } = require("../../utils/authenticatePaymob");
const axios = require("axios");
const initiatePayment = async (type, name, amount, userDetail) => {
  try {
    // Authentication Request -- step 1 in the docs
    const authRequest = await authenticate(name);

    const PAYMOB_URL = "https://accept.paymob.com/api";

    // Order Registration API -- step 2 in the docs
    const orderUrl = `${PAYMOB_URL}/ecommerce/orders`;
    const headers = {
      "Content-Type": "application/json",
    };
    const orderData = {
      auth_token: authRequest.accessToken,
      delivery_needed: "false",
      amount_cents: parseInt(amount) * 100,
      currency: "EGP",
      items: [],
    };
    const order = await axios.post(orderUrl, orderData, { headers });
    const orderId = order.data.id;

    // Payment Key Request  -- step 3 in the docs
    const paymentKeyUrl = `${PAYMOB_URL}/acceptance/payment_keys`;
    const billing_data = {
      apartment: "NA",
      email: userDetail.email,
      floor: "NA",
      first_name: userDetail.firstname,
      street: "NA",
      building: "NA",
      //phone_number: "+86(8)9135210487",
      phone_number: `${userDetail.country_code}${userDetail.phone}`,
      shipping_method: "NA",
      postal_code: "NA",
      city: "NA",
      country: "NA",
      last_name: userDetail.lastname,
      state: "NA",
    };

    const paymentKeyData = {
      auth_token: authRequest.accessToken,
      amount_cents: order.data.amount_cents,
      expiration: 3600,
      order_id: orderId,
      billing_data,
      shipping_details: {
        notes: type,
      },
      currency: "EGP",
      integration_id: authRequest.integrationId, // Replace with your integration id
    };
    const paymentKey = await axios.post(paymentKeyUrl, paymentKeyData, headers);

    // create the payment link
    return {
      orderId,
      link: `https://accept.paymob.com/api/acceptance/iframes/${authRequest.frameId}?payment_token=${paymentKey.data.token}`,
    };
  } catch (err) {
    return false;
  }
};

const callback = async (req, res, next) => {};

module.exports = {
  initiatePayment,
  callback,
};
