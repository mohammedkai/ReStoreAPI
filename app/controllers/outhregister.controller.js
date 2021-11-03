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

outhRegister.post('/verifyOauthToken', async (req, res, next) => {
  const idToken = req.body.accessToken;
  const columnName = req.body.columnName;
  const reqBody = {
    firstName : req.body.firstName===undefined?'':req.body.firstName,
     lastName:req.body.lastName===undefined?'':req.body.lastName,
     login: req.body.login===undefined?'':req.body.login,
      password= req.body.password===undefined?'':req.body.password,
     authId: null,
     middleName: req.body.middleName===undefined?'':req.body.middleName,
     phonenumber: req.body.phonenumber===undefined?'':req.body.phonenumber,
     isOAuth: req.body.isOauthRegistered===undefined?'':req.body.isOauthRegistered,
     isPhoneVerified:req.body.isPhoneVerified===undefined?'':req.body.isPhoneVerified,

  }
 verifyOauthToken(idToken, columnName,reqBody, res).catch(console.error);

});

async function verifyOauthToken(token, columnName,reqBody, resObject) {
  fbadmin
    .auth()
    .verifyIdToken(token)
    .then(async decodedToken => {
      var requestColumnValue = '';
      const phoneNumber = decodedToken.phone_number;
      const uid = decodedToken.uid;
      const email = decodedToken.email;
      let payload;

      if (columnName.toLowerCase() == 'phonenumber') {
        // requestColumnValue = '9821784084';
        requestColumnValue = phoneNumber
        payload = phoneNumber;
      } else {
        requestColumnValue = email;
        columnName='login';
        payload = email;
      }
      checkUserExist(columnName, requestColumnValue,(err,isUserExist)=>{
        if(err){
          return resObject.status(500).send({ errorCode: 500, errorMessage: err });
        }
        console.log(isUserExist);
        if(isUserExist){
         const responseData = generateToken(payload);
         resObject.status(200).send(responseData);
        }else{
          createUser(reqBody.firstName,reqBody.lastName,reqBody.login,reqBody.password,reqBody.middleName,uuid,reqBody.phonenumber,reqBody.isOauthRegistered,reqBody.isPhoneVerified);
          const responseData = generateToken(payload);
          resObject.status(200).send(responseData);
        }

      });

    })
    .catch(err => {return resObject.status(500).send({ errorCode: 500, errorMessage: err })});
}

async function checkUserExist(columnname, columnvalue,result) {
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
        return result(null,data.outBinds['ispresent']);
      } 
      catch (err) {
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

function generateToken(payload){
  const accessToken = jwt.sign({ username: payload }, jwtKey, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });

  const refreshToken = jwt.sign({ username:payload }, refreshTokenSecret, {
    algorithm: 'HS256',
    expiresIn: '15d',
  });
  refreshTokens.push(refreshToken);
  return {
    isSuccess:true,
    accessToken,
    refreshToken
  }
}

function createUser(firstName,lastName,login,password,middleName,uuid,phonenumber,isOauthRegistered,isPhoneVerified,result){
  const user = new User({
    firstName: firstName,
    lastName: lastName,
    login: login,
    isActive: 1,
    role: 1,
    password: password,
    authId: null,
    middleName: middleName,
    uuid: uuid,
    phonenumber: phonenumber,
    isOAuth: isOauthRegistered,
    isPhoneVerified:isPhoneVerified
  });
  User.create(user, (err, data) => {
    if (err) {
      if (err.message.indexOf('unique') > -1) {
        return result({
          message: 'User already exist',
          isSuccess: false,
        });
      }
     
    } else return result(null,data);
  });
}
module.exports = outhRegister;
