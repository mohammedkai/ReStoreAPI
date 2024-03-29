const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const userExpress = express();
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
        ispresent: { dir: oracledb.BIND_OUT, type: oracledb.VARCHAR },
      };
      try 
      {
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
          } finally 
          {
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

userExpress.post('/getUsersMetadata', async (req, res, next) => {
  const query = 'CALL sp_get_users_metadata(:user_id, :ref_cur_0)';
  const metadata_binds = {
    user_id: req.body.User_Id,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const usersmetadata = await dbSvc.simpleExecute(query, metadata_binds, 1, 'default');
    if (usersmetadata.ref_cur_0[0].length > 0) {
      usersmetadata.ref_cur_0[0][0]['isSuccess'] = true;
      res.status(200).send(usersmetadata.ref_cur_0[0][0]);
    } else {
      res.status(200).send({ isSuccess: false });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

userExpress.post('/updateUsersMetadata', async (req, res, next) => {
  const query =
    'CALL sp_update_user_metadata(:user_id,:phone_no,:operation_id,:selected_address_id,:fullname,:emailid,:issuccess)';
  const update_metadata_binds = {
    user_id: req.body.UserId,
    phone_no: req.body.PhoneNumber,
    operation_id: req.body.operationId,
    selected_address_id: req.body.SelectedAddressOrderId,
    fullname: req.body.FirstName,
    emailid: req.body.EmailAddress,
    issuccess: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, update_metadata_binds, options);
        if (result.outBinds.issuccess == 2) {
          res.status(200).send({
            isSuccess: false,
            errorMessage: 'Email id is already registered with other user',
          });
        } else {
          res.status(200).send({ isSuccess: true });
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

userExpress.post('/getUserMetaDetails', async (req, res, next) => {
  const query = 'CALL sp_get_users_meta_details(:user_id,:userdatajson)';
  const user_meta_detail = {
    user_id: req.body.UserId,
    userdatajson: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20000 },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, user_meta_detail, options);
        var parseObject = JSON.parse(result.outBinds.userdatajson);
        parseObject.userDetails[0]['isSuccess'] = true;
        res.status(200).send(parseObject.userDetails[0]);
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

userExpress.post('/sendVerifyEmail', async (req, res, next) => {
  try {
    const email = req.body.login;
    const accessToken = jwt.sign({ username: email }, jwtKey, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });
    const replacement = {
      VERIFICATION_LINK: `${process.env.AZURE_API_URL}/users/verifyEmail?token=${accessToken}`,
    };
    let subject = 'Please verify your email for ReStore';
    let htmlPath = path.join(__dirname, '..', 'templates','pages', 'verifyTemplate.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let html = templateString(htmlContent, replacement);
    const emailResponse = await sendEmail({ to: email, subject, html });

    res.status(200).send(emailResponse);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

userExpress.get('/verifyEmail', async (req, res, next) => {
  const query = `UPDATE users_metadata_table SET ISEMAILVERIFIED = 1 WHERE USERSID = (select id from users where login = :login)`;
  const options = { autoCommit: true };
  try {
    const token = req.query.token;
    if (!token) {
      return res.status(403).send({ message: 'No token provided.', isSuccess: false });
    }
    let replacement = {
      MESSAGE: `User verified successfully. Please login to the application`,
    };
    let htmlPath = path.join(__dirname, '..', 'templates', 'pages','emailVerified.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');

    jwt.verify(token, jwtKey, (err, response) => {
      if (err) {
        replacement['DISPLAY_SUCCESS'] = 'none';
        replacement['DISPLAY_FAILURE'] = 'block';
        replacement['EMAILID'] = response.username;

        return res.status(200).send(templateString(htmlContent, replacement));
      }
      const update_metadata_binds = {
        login: response.username,
      };
      db.doConnect(async (err, connection) => {
        try {
          const result = await connection.execute(query, update_metadata_binds, options);
          replacement['DISPLAY_SUCCESS'] = 'block';
          replacement['DISPLAY_FAILURE'] = 'none';
          replacement['EMAILID'] = response.username;
          return res.status(200).send(templateString(htmlContent, replacement));
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
    });
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

userExpress.post('/resetPasswordEmail', async (req, res, next) => {
  try {
    const query = `UPDATE users_metadata_table SET token = :token WHERE USERSID = (select id from users where login = :login)`;
    const options = { autoCommit: true };
    const email = req.body.EmailAddress;
    const accessToken = jwt.sign({ username: email }, jwtKey, {
      algorithm: 'HS256',
      expiresIn: '24h',
    });
    const replacement = {
      RESET_LINK: `${process.env.AZURE_API_URL}/users/openNewPassword?token=${accessToken}&login=${email}`,
      // RESET_LINK: `http://localhost:8080/users/openNewPassword?token=${accessToken}&login=${email}`,
    };
    let subject = 'ReStore: Reset your password';
    let htmlPath = path.join(__dirname, '..', 'templates', 'pages','resetPassword.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let html = templateString(htmlContent, replacement);
    const emailResponse = await sendEmail({ to: email, subject, html });
    const update_metadata_binds = {
      login: email,
      token: accessToken,
    };
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, update_metadata_binds, options);
        return res.status(200).send(emailResponse);
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

userExpress.get('/openNewPassword', async (req, res, next) => {
  try {
    const query = `select u.id,u.login,um.token from users u JOIN users_metadata_table um on u.id = um.USERSID where u.login =  :login`;
    const token = req.query.token;
    const email = req.query.login;
    const options = { autoCommit: true };
    if (!token) {
      return res.status(403).send({ message: 'No token provided.', isSuccess: false });
    }

    const select_metadata_binds = {
      login: email,
    };

    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, select_metadata_binds, options);
        const userToken = result['rows'][0][2];
        if (userToken == null) {
          return res.status(200).send({
            isSuccess: false,
            message: 'Link Expired. You have already changed your password',
          });
        } else if (token != userToken) {
          return res.status(404).send({ isSuccess: false, message: 'Invalid Token' });
        }
        const replacement = {
          UPDATE_PASSWORD: `${process.env.AZURE_API_URL}/user/changePassword`,
          // UPDATE_PASSWORD: `http://localhost:8080/user/changePassword`,
        };

        jwt.verify(token, jwtKey, (err, response) => {
          if (err) {
            return res.status(200).send({ isSuccess: false, message: 'Invalid Token' });
          }
          let htmlPath = path.join(__dirname, '..', 'templates', 'pages','changePassword.html');
          let htmlContent = fs.readFileSync(htmlPath, 'utf8');
          let html = templateString(htmlContent, replacement);
          res.status(200).send(html);
        });
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

userExpress.post('/getActiveAdsForUser', async (req, res, next) => {
  const query = 'CALL SP_VERIFY_USER_ADVERTISE(:users_id,:ref_cur_0)';
  const userId = req.body.userId;
  const advertiseBind = {
    users_id:userId,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const activeAdvertises = await dbSvc.simpleExecute(query, advertiseBind, 1, 'default');
    if(activeAdvertises.ref_cur_0[0].length > 0)
    {
    res.status(200).send({ isSuccess: true, advertiseMasterList: activeAdvertises.ref_cur_0[0] });
    }
    else
    {
      res.status(200).send({ isSuccess: false, advertiseMasterList: [] });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});



userExpress.post('/updateUserAdvertise', async (req, res, next) => {
  const query = 'CALL SP_UPDATE_USER_POINTS(:userId,:addId,:jsonstring)';
  const userId = req.body.userId;
  const addId = req.body.addId;
  const options = { autoCommit: true };
  const advertiseBind = {
    userId:userId,
    addId:addId,
    jsonstring: {  dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20000  },
  };
  try {

    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, advertiseBind, options);
        let parseObject = JSON.parse(result.outBinds.jsonstring);
        return res.status(200).send({isSuccess: true,jsonstring:parseObject});
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
    
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});





module.exports = userExpress;
