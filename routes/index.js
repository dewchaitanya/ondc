const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const nacl = require("tweetnacl");
const crypto = require("crypto");
const _sodium = require('libsodium-wrappers');
const moment = require('moment');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function generateKeyPairs() {
  const signingKeyPair = nacl.sign.keyPair();
  const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return {
    Signing_private_key: Buffer.from(signingKeyPair.secretKey).toString(
      "base64"
    ),
    Signing_public_key: Buffer.from(signingKeyPair.publicKey).toString(
      "base64"
    ),
    Encryption_Privatekey: privateKey.toString('utf-8')
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, ''),
    Encryption_Publickey: publicKey.toString('utf-8')
      .replace(/-----BEGIN PUBLIC KEY-----/, '')
      .replace(/-----END PUBLIC KEY-----/, '')
      .replace(/\s/g, ''),
  };
}
let keyPairs = generateKeyPairs();
let ENCRYPTION_PRIVATE_KEY = keyPairs.Encryption_Privatekey;
let ONDC_PUBLIC_KEY = "MCowBQYDK2VuAyEAduMuZgmtpjdCuxv+Nc49K0cB6tL/Dj3HZetvVN7ZekM=";
let REQUEST_ID = crypto.randomUUID();
let SIGNING_PRIVATE_KEY = keyPairs.Signing_private_key;


const htmlFile = `
<!--Contents of ondc-site-verification.html. -->
<!--Please replace SIGNED_UNIQUE_REQ_ID with an actual value-->
<html>
  <head>
    <meta
      name="ondc-site-verification"
      content="SIGNED_UNIQUE_REQ_ID"
    />
  </head>
  <body>
    ONDC Site Verification Page
  </body>
</html>
`;
// Pre-defined public and private keys
const privateKey = crypto.createPrivateKey({
  key: Buffer.from(ENCRYPTION_PRIVATE_KEY, 'base64'), // Decode private key from base64
  format: 'der', // Specify the key format as DER
  type: 'pkcs8', // Specify the key type as PKCS#8
});
const publicKey = crypto.createPublicKey({
  key: Buffer.from(ONDC_PUBLIC_KEY, 'base64'), // Decode public key from base64
  format: 'der', // Specify the key format as DER
  type: 'spki', // Specify the key type as SubjectPublicKeyInfo (SPKI)
});

// Calculate the shared secret key using Diffie-Hellman
const sharedKey = crypto.diffieHellman({
  privateKey: privateKey,
  publicKey: publicKey,
});



// Routes
router.get('/keyPairs', (req, res) => {
    let obj = {};
    obj.keyPairs = generateKeyPairs();
    obj.uuid = crypto.randomUUID();
    res.send(obj);
});

router.post('/subscribe', function(req, res) {
    let obj = {
        "context": {
          "operation": {
            "ops_no": 2
          }
        },
        "message": {
          "request_id": REQUEST_ID,
          "timestamp": moment.valueOf(),
          "entity": {
            "gst": {
              "legal_entity_name": "ABC Incorporates",
              "business_address": "Trade World, Mansarpur, Coorg, Karnataka 333333",
              "city_code": [
                "std:080"
              ],
              "gst_no": "07AAACN2082N4Z7"
            },
            "pan": {
              "name_as_per_pan": "ABC Incorporates",
              "pan_no": "ASDFP7657Q",
              "date_of_incorporation": "23/06/1982"
            },
            "name_of_authorised_signatory": "Anand Sharma",
            "address_of_authorised_signatory": "405, Pinnacle House, Kandiwali, Mumbai 400001",
            "email_id": "anand.sharma@abc.com",
            "mobile_no": 9912332199,
            "country": "IND",
            "subscriber_id": "sit.grab.in",
            "unique_key_id": "27baa06d-f90a-486c-85e5-cc621b787f04",
            "callback_url": "/ondc/onboarding",
            "key_pair": {
              "signing_public_key": "QSax2KT4UiTUWUqoVUaEcWhBcGTTNu+Sf8EMDRY1GaE=",
              "encryption_public_key": "O74ukMymk4KZnVs3sZhU2U7RXpaZ/qiOUMk5NWt6rbI=",
              "valid_from": "2022-07-08T13:44:54.101Z",
              "valid_until": "2022-07-08T13:44:54.101Z"
            }
          },
          "network_participant": [
            {
              "subscriber_url": "/bapl",
              "domain": "nic2004:52110",
              "type": "sellerApp",
              "msn": false,
              "city_code": [
                "std:080"
              ]
            }
          ]
        }
      }
      
})

router.post("/submitSellerData", async (req, res) => {
    let keyPairObj = generateKeyPairs();
    let unique_id = crypto.randomUUID();
    const { 
        legal_entity_name, 
        business_address, 
        city_code, 
        gst_no, 
        name_as_per_pan, 
        pan_no, 
        date_of_incorporation, 
        name_of_authorised_signatory, 
        address_of_authorised_signatory, 
        email_id, 
        mobile_no, 
        country, 
        subscriber_id,
        subscriber_url, 
        domain } = req.body;
    let {
        request_id,
        signing_public_key,
        encryption_public_key
    } = req.body;

    if(request_id){
        unique_id = request_id;
    }
    if(signing_public_key){
        keyPairObj.Signing_public_key = signing_public_key;
    }
    if(encryption_public_key){
        keyPairObj.Encryption_Publickey = encryption_public_key;
    }
    let obj = {
        "context": {
          "operation": {
            "ops_no": 2
          }
        },
        "message": {
          "request_id": unique_id,
          "timestamp": moment().toISOString(),
          "entity": {
            "gst": {
              "legal_entity_name": legal_entity_name,
              "business_address": business_address,
              "city_code": [city_code],
              "gst_no": gst_no
            },
            "pan": {
              "name_as_per_pan": name_as_per_pan,
              "pan_no": pan_no,
              "date_of_incorporation": date_of_incorporation
            },
            "name_of_authorised_signatory": name_of_authorised_signatory,
            "address_of_authorised_signatory": address_of_authorised_signatory,
            "email_id": email_id,
            "mobile_no": mobile_no,
            "country": country,
            "subscriber_id": subscriber_id,
            "unique_key_id": unique_id,
            "callback_url": "/ondc/onboarding",
            "key_pair": {
                "signing_public_key": keyPairObj.Signing_public_key,
                "encryption_public_key": keyPairObj.Encryption_Publickey,
                "valid_from": moment().toISOString(),
                "valid_until": moment().add(2, 'years').toISOString()
            }
          },
          "network_participant": [
            {
              "subscriber_url": subscriber_url,
              "domain": domain,
              "type": "sellerApp",
              "msn": false,
              "city_code": [
                city_code
              ]
            }
          ]
        }
    }

    let subscribeReq = await axios.post(process.env.subscribe_url, obj)
    let result = {
        obj,
        ondcresponse: subscribeReq.data
    }
    res.status(200).send(result);
})

// Route for handling subscription requests
router.post('/on_subscribe', function (req, res) {
    const { challenge } = req.body; // Extract the 'challenge' property from the request body
    const answer = decryptAES256ECB(sharedKey, challenge); // Decrypt the challenge using AES-256-ECB
    const resp = { answer: answer };
    res.status(200).json(resp); // Send a JSON response with the answer
});
  
  // Route for serving a verification file
router.get('/ondc-site-verification.html', async (req, res) => {
    const signedContent = await signMessage(REQUEST_ID, SIGNING_PRIVATE_KEY);
    // Replace the placeholder with the actual value
    const modifiedHTML = htmlFile.replace(/SIGNED_UNIQUE_REQ_ID/g, signedContent);
    // Send the modified HTML as the response
    res.send(modifiedHTML);
});
  
  // Default route
router.get('/', (req, res) => res.send('Hello World!'));
  
  // Health check route
router.get('/health', (req, res) => res.send('Health OK!!'));


let createAccountJSONPath = './create_account.json';
let profileDetailsJSONPath = './profile_details.json';

// Function to read data from the JSON file
const readDataFromFile = (filePath) => {
    try {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      // If file does not exist or is empty, return an empty array
      return [];
    }
  };
  
  // Function to write data to the JSON file
  const writeDataToFile = (filePath, data) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  };

  const pushToFile = (req, filePath) => {
    const newData = req.body;

    // Read existing data from the file
    const data = readDataFromFile(filePath);
    console.log(data);
  
    // Append new data
    data.push(newData);
  
    // Write updated data back to the file
    writeDataToFile(filePath, data);
  }


router.post("/create_account", (req, res) => {
    pushToFile(req, createAccountJSONPath);
    res.status(201).send('Create Account data saved successfully.');
})

router.post("/profile_details", (req, res) => {
    pushToFile(req, profileDetailsJSONPath);
    res.status(201).send('Profile Details data saved successfully.');
})



router.get('/create_account_data', (req, res) => {
    const data = readDataFromFile(createAccountJSONPath);
    res.send(data);
});

router.get('/profile_details_data', (req, res) => {
    const data = readDataFromFile(profileDetailsJSONPath);
    res.send(data);
});

router.get('/clearCreateAccount', (req, res) => {
    writeDataToFile(createAccountJSONPath, []);
    res.send('Data cleared successfully');
})

router.get('/clearProfileDetails', (req, res) => {
    writeDataToFile(profileDetailsJSONPath, []);
    res.send('Data cleared successfully');
})
  



// export the router module so that server.js file can use it
module.exports = router;