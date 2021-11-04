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
var refreshTokens = [];
const randomString = require('node-uuid');

outhRegister.post('/verifyOauthToken', async (req, res, next) => {
  const idToken = req.body.oauthToken;
  const columnName = req.body.columnName;
  verifyOauthToken(idToken, columnName, req, res).catch(console.error);
});

async function verifyOauthToken(token, columnName, req, resObject) {
  fbadmin
    .auth()
    .verifyIdToken(token)
    .then(async decodedToken => {
      var requestColumnValue = '';
      let phoneNumber;
      const uuid = decodedToken.uid;
      let email;
      let payload;
      let firstName;
      let isOauthRegistered;
      let isPhoneVerified;
      if (columnName.toLowerCase() == 'phonenumber') {
        // requestColumnValue = '9821784084';
        email = req.body.login === undefined ? null : req.body.login;
        firstName = req.body.firstName === undefined ? null : req.body.FirstName;
        requestColumnValue = phoneNumber;
        payload = phoneNumber;
        isOauthRegistered = 0;
        isPhoneVerified = 1;
        phoneNumber = decodedToken.phone_number.substring(3);
      } else {
        requestColumnValue = email;
        columnName = 'login';
        firstName = decodedToken.name;
        payload = email;
        isOauthRegistered = 1;
        isPhoneVerified = 0;
        email = decodedToken.email;
      }
      checkUserExist(columnName, requestColumnValue, (err, isUserExist) => {
        if (err) {
          return resObject.status(500).send({ errorCode: 500, errorMessage: err });
        }
        console.log(isUserExist);
        if (isUserExist === 'true') {
          const responseData = generateToken(payload);
          responseData['uuid'] = uuid;
          resObject.status(200).send(responseData);
        } else {
          createUser(
            firstName,
            req.body.lastName,
            email,
            req.body.middleName,
            uuid,
            phoneNumber,
            isOauthRegistered,
            isPhoneVerified
          );
          const responseData = generateToken();
          responseData['uuid'] = uuid;
          resObject.status(200).send(responseData);
        }
      });
    })
    .catch(err => {
      return resObject.status(500).send({ errorCode: 500, errorMessage: err });
    });
}

async function checkUserExist(columnname, columnvalue, result) {
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
        const data = await connection.execute(query, verfiyUserExistBinds, options);
        return result(null, data.outBinds['ispresent']);
      } catch (err) {
        return resObject.status(500).send({ errorCode: 500, errorMessage: err });
      } finally {
        if (connection) {
          try {
            await connection.close();
          } catch (err) {
            return resObject.status(500).send({ errorCode: 500, errorMessage: err });
            console.error(err);
          }
        }
      }
    });
  } catch (err) {
    return resObject.status(500).send({ errorCode: 500, errorMessage: err });
  }
}

function generateToken(payload) {
  const accessToken = jwt.sign({ username: payload }, jwtKey, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ username: payload }, refreshTokenSecret, {
    algorithm: 'HS256',
    expiresIn: '15d',
  });
  refreshTokens.push(refreshToken);
  return {
    isSuccess: true,
    accessToken,
    refreshToken,
  };
}

function createUser(
  firstName,
  lastName,
  login,
  middleName,
  uuid,
  phonenumber,
  isOauthRegistered,
  isPhoneVerified,
  result
) {
  const user = new User({
    firstName: firstName === undefined ? null : firstName,
    lastName: lastName === undefined ? null : lastName,
    login: login === undefined ? null : login,
    isActive: 1,
    role: 1,
    password: randomString.v1(),
    authId: null,
    middleName: middleName === undefined ? null : middleName,
    uuid: uuid === undefined ? null : uuid,
    phonenumber: phonenumber === undefined ? null : phonenumber,
    isOAuth: isOauthRegistered,
    isPhoneVerified: isPhoneVerified,
  });
  User.create(user, (err, data) => {
    if (err) {
      if (err.message.indexOf('unique') > -1) {
        return result({
          message: 'User already exist',
          isSuccess: false,
        });
      }
    } else return result(null, data);
  });
}
module.exports = outhRegister;
