const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const outhRegister = express();
const { OAuth2Client } = require('google-auth-library');
const fbadmin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const sendEmail = require('../utils/emailHelper.js');
const jwtKey = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_SECRET;
const fs = require('fs');
const path = require('path');
const { templateString } = require('../utils/StringUtils');
const User = require('../models/user.model.js');

outhRegister.post('/verifyOauthToken', async (req, res, next) => {
  const idToken = req.body.accessToken;
  const columnName = req.body.columnName;
  verifyOauthToken(idToken, columnName, res).catch(console.error);
});

async function verifyOauthToken(token, columnName, resObject) {
  fbadmin
    .auth()
    .verifyIdToken(token)
    .then(async decodedToken => {
      var requestColumnValue = '';
      const phoneNumber = decodedToken.phone_number;
      const uid = decodedToken.uid;
      const email = decodedToken.email;

      if (columnName == 'phonenumber' || columnName == 'PHONENUMBER') {
        requestColumnValue = '9821784084';
      } else {
        requestColumnValue = email;
      }
      var isUserExit = await checkUserExist(columnName, requestColumnValue);
    })
    .catch(err => {});
}

async function checkUserExist(columnname, columnvalue) {
  const query = 'CALL sp_check_login_credentials(:dynamic_name, :column_value,:ispresent)';
  const options = {};
  const verfiyUserExistBinds = {
    dynamic_name: columnname,
    column_value: columnvalue,
    ispresent: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
  };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, verfiyUserExistBinds, options);
      } 
      catch (err) {
        resObject.status(500).send({ errorCode: 500, errorMessage: err });
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            console.error(err);
          }
        }
      }
    });
  } catch (err) {
    resObject.status(500).send({ errorCode: 500, errorMessage: err });
  }
}

module.exports = outhRegister;
