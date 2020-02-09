const https = require('https');
const fs = require('fs');
const confidential = require('./clients/confidential/app');
const key = fs.readFileSync('./localhost-key.pem');
const cert = fs.readFileSync('./localhost.pem');

https.createServer({key, cert}, confidential({
  baseUrl: 'https://localhost:3000',
})).listen('3000', () => {
  console.log('Listening on https://localhost:3000');
});
