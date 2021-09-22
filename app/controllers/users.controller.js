const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const userExpress = express();
const { OAuth2Client } = require('google-auth-library');
const fbadmin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const jwtKey = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_SECRET;

userExpress.post('/checkIfUserExist', async (req, res, next) => {
  const query = 'CALL sp_check_login_credentials(:dynamic_name, :column_value,:ispresent)';
  const requestType = req.body.type;
  const reuqestparam = req.body.value;
  let columname;
  const options = {};
  if (requestType == 1) {
    columname = 'login';
  } else {
    columname = 'phonenumber';
  }
  verfiyUserExistPara = {
    dynamic_name: columname,
    column_value: reuqestparam,
    ispresent: { dir: oracledb.BIND_OUT, type: oracledb.VACHAR },
  };

  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, verfiyUserExistPara, options);
        res.status(200).send({ isUserExist: result.outBinds.ispresent == 'true', isSuccess: true });
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err });
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
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

userExpress.get('/verifyUser/:token', async (req, res, next) => {
  const idToken = req.params.token;
  verifyToken(idToken, res).catch(console.error);
});

userExpress.post('/verifyUserToken', async (req, res, next) => {
  const idToken = req.body.accessToken;
  verifyToken(idToken, res).catch(console.error);
});

async function verifyToken(token, resObject) {
  fbadmin
    .auth()
    .verifyIdToken(token)
    .then(decodedToken => {
      const uid = decodedToken.uid;
      const query = 'CALL sp_check_login_credentials(:dynamic_name, :column_value,:ispresent)';
      const reuqestparam = decodedToken.email;
      let columname = 'login';
      const options = {};
      verfiyUserExistPara = {
        dynamic_name: columname,
        column_value: reuqestparam,
        ispresent: { dir: oracledb.BIND_OUT, type: oracledb.VACHAR },
      };
      try {
        db.doConnect(async (err, connection) => {
          try {
            const result = await connection.execute(query, verfiyUserExistPara, options);
            if (result.outBinds.ispresent == 'true') {
              const accessToken = jwt.sign(
                {
                  username: reuqestparam,
                },
                jwtKey,
                {
                  algorithm: 'HS256',
                  expiresIn: '15m',
                }
              );
              const refreshToken = jwt.sign({ username: reuqestparam }, refreshTokenSecret, {
                algorithm: 'HS256',
                expiresIn: '30m',
              });
              resObject.status(200).send({
                isUserExist: result.outBinds.ispresent == 'true',
                isSuccess: true,
                UserDataResponse: decodedToken,
                accessToken: accessToken,
                refreshToken: refreshToken,
              });
            } else {
              resObject.status(200).send({
                isUserExist: result.outBinds.ispresent == 'true',
                isSuccess: true,
                UserDataResponse: decodedToken,
              });
            }
          } catch (err) {
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
    })
    .catch(error => {
      resObject.status(200).send({ isSuccess: false, message: error });
      // Handle error
    });
}

userExpress.post('/updateFCMToken', async (req, res, next) => {
  const sql = 'CALL sp_update_user_fcm_token(:users_id,:sellers_id,:fcmtokenstring,:response)';
  const userfcmBinds = {
    users_id: req.body.userId,
    sellers_id: req.body.sellerId,
    fcmtokenstring: req.body.fcmTokenString,
    response: { dir: oracledb.BIND_OUT, type: oracledb.CHAR },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, userfcmBinds, options);
        if (
          result !== undefined &&
          result.outBinds !== undefined &&
          result.outBinds.response == 1
        ) {
          res.status(200).send({ response: result.outBinds.response, isSuccess: true });
        } else {
          res.status(201).send({ response: null, isSuccess: false });
        }
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err });
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
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

userExpress.post('/addToWishList', async (req, res, next) => {
  const query =
    'CALL sp_add_to_wishlist(:user_id,:product_id,:operation_id,:wishlist_id,:response)';
  const wishlistBinds = {
    user_id: req.body.userId,
    product_id: req.body.productId,
    operation_id: req.body.operationId,
    wishlist_id: req.body.wishlistId,
    response: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, wishlistBinds, options);
        if (
          result !== undefined &&
          result.outBinds !== undefined &&
          result.outBinds.response == 1
        ) {
          res.status(200).send({ response: result.outBinds.response, isSuccess: true });
        } else if (
          result !== undefined &&
          result.outBinds !== undefined &&
          result.outBinds.response == 3
        ) {
          res.status(200).send({ response: result.outBinds.response, isSuccess: true });
        } else {
          res.status(201).send({ response: null, isSuccess: false });
        }
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err.message });
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
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

module.exports = userExpress;
