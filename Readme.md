# Setup

## Salesforce setup

- Create a new Apex Class in your Salesforce instance in developer console `https://<YOUR_SALESFORCE_INSTANCE_URL>.my.salesforce.com/_ui/common/apex/debug/ApexCSIPage`
- Create a new Connected Application under `https://<YOUR_SALESFORCE_INSTANCE_URL>.lightning.force.com/lightning/setup/NavigationMenus/home` and activate Oauth. YOu can set any redirect_url, as we don't need it or by enabling device flow.
- Add Oauth scopes "Access and manage your data (api)", "Access your basic information" and "Perform requests on your behalf at any time"
- Save the app and go to manage it, to get your client/consumer key and secret to fill into the .env file

## Node and Nexmo setup

- Run `npm i`
- Run `cp .env.example .env` and fill in _ALL_ values of your new .env file
- Use https://ngrok.io or another service to expose the local server to the web with command `ngrok http 3000`
  - You can install ngrok with `npm i -g ngrok` if you don't have it.
- Go to https://dashboard.nexmo.com/messages/sandbox (or your application at https://dashboard.nexmo.com/applications) and define the inbound message webhook url as `https://<YOUR_NGROK_URL>/webhooks`
- Start server with `npm run start`

# How it works

Any incoming message will be sent to the NodeJS server via Webhook. The Server will check if the message is really coming from Nexmo by checking it's Signature and also check that is has not been tempered with.

After the message has been verified, the Server will get a user access token from Salesforce and then call the Salesforce Apex REST API that we created to send the data. For Demo purposes, Salesforce will not store the data but only return the message back to the server.
