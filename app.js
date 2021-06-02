require("dotenv").config();
const express = require("express");
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const VONAGE_API_SIGNATURE_SECRET = process.env.VONAGE_API_SIGNATURE_SECRET;
const jwt = require("jsonwebtoken");
const sha256 = require("js-sha256");
const axios = require("axios").default;
const qs = require("qs");

app.post("/webhooks", async (req, res) => {
  // first we check if the message really comes from Vonage by checking the signature
  // see documentation at: https://developer.nexmo.com/messages/concepts/signed-webhooks
  const payload = Object.assign(req.query, req.body);
  let token = req.headers.authorization?.split(" ")[1] || null;

  try {
    if (!token) {
      throw "Bad or no auth token detected.";
    }
    var decoded = jwt.verify(token, VONAGE_API_SIGNATURE_SECRET, {
      algorithms: ["HS256"],
    });

    if (sha256(JSON.stringify(payload)) != decoded["payload_hash"]) {
      throw "Message tampering detected.";
    } else {
      console.log("Incoming message successfully verified.");
      // now we send on the request to Salesforce
      // we need to authenticate there first
      const sfResponse = await axios({
        method: "post",
        url: "https://login.salesforce.com/services/oauth2/token",
        data: qs.stringify({
          grant_type: "password",
          client_id: process.env.SF_CONSUMER_KEY,
          client_secret: process.env.SF_CONSUMER_SECRET,
          username: process.env.SF_USER_NAME,
          password:
            process.env.SF_USER_PASSWORD + process.env.SF_USER_SECURITY_TOKEN,
        }),
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=utf-8",
        },
      });

      // fetching the user access token from the response
      const sfAccessToken = sfResponse.data.access_token;

      // now calling a salesforce Rest API endpoint that we created (by creating an ApexClass in salesforce which contains the example file in the project folder: ApexRESTSample.class)
      const sfResponse2 = await axios({
        method: "post",
        url: `https://${process.env.SF_INSTANCE_NAME}.my.salesforce.com/services/apexrest/${process.env.SF_APEX_URL_MAPPING}`,
        headers: {
          Authorization: `Bearer ${sfAccessToken}`,
          "Content-Type": "application/json",
          Accept: "*/*",
        },
        data: JSON.stringify({
          message: req.body.message.content.text,
          mfrom: req.body.from.number,
          to: req.body.to.number || req.body.to.id,
          type: req.body.from.type,
          message_uuid: req.body.message_uuid,
          timestamp: req.body.timestamp,
        }),
      });

      // log answer from salesforce, which should be a replica of the message received
      console.log(sfResponse2.data);

      // send status back to Nexmo webhook caller, so it does not retry
      res.sendStatus(200);
    }
  } catch (err) {
    console.log(err);
    res.status(401).json({
      error: err,
    });
  }
});

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
