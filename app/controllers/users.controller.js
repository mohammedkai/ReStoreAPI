const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const userExpress = express();
const { OAuth2Client } = require('google-auth-library');
const fbadmin = require('firebase-admin');

userExpress.get('/verifyUser/:token', async (req, res, next) => {
  const idToken = req.params.token;
  verifyToken(idToken, res).catch(console.error);
});

async function verifyToken(token, resObject) {
  fbadmin
    .auth()
    .verifyIdToken(token)
    .then(decodedToken => {
      const uid = decodedToken.uid;
      resObject.status(200).send({ isSuccess: true, UserDataResponse : decodedToken });
    })
    .catch(error => {
      resObject.status(200).send({ isSuccess: false, message: error });
      // Handle error
    });
}

module.exports = userExpress;
