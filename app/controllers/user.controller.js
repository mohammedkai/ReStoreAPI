const User = require('../models/user.model.js');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const jwt = require('jsonwebtoken');
const jwtKey = process.env.JWT_SECRET;


/**
 * @swagger
 * /user/register:
 *   post:
 *     tags:
 *       - Users
 *     name: Add User
 *     summary: Creates a new user.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add user properties in JSON format.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             firstName:
 *               type: string
 *             middleName:
 *               type: string
 *             lastName:
 *               type: string
 *             login:
 *               type: string
 *             role:
 *               type: string
 *             password:
 *               type: string
 *               format: password
 *         required:
 *           - username
 *           - lastName
 *           - login
 *           - role
 *           - password
 *     responses:
 *       200:
 *         description: User created successfully
 *       500:
 *         description: Internal Server Error
 *       409:
 *         description: Username already exist
 */

exports.create = (req, res, next) => {
  // Validate request
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: 'Content of can not be empty!',
      isSuccess: false,
    });
  }

  // Creates a User

  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    login: req.body.login,
    isActive: 1,
    role: 1,
    password: req.body.password,
    authId: null,
    middleName: req.body.middleName,
    uuid : req.body.uuid,
    phonenumber:req.body.phonenumber
  });
  // Save user in the database
  User.create(user, (err, data) => {
    if (err) {
      if (err.message.indexOf('unique') > -1) {
        return res.status(409).send({
          message: 'User already exist',
          isSuccess: false,
        });
      }
      next(err);
    } else return res.status(200).send(data);
  });
};

/**
 * @swagger
 * /user/login:
 *   post:
 *     tags:
 *       - Users
 *     name: JWT Token
 *     summary: Generate a new JWT Token.
 *     requestBody:
 *       description: Add user and password properties in JSON format.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             login:
 *               type: string
 *             password:
 *               type: string
 *               format: password
 *             fcmToken:
 *               type: string
 *         required:
 *           - login
 *           - password
 *           - fcmToken
 *     responses:
 *       200:
 *         description: access token
 *       404:
 *         description: Username does not exist.
 *       401:
 *         description: Authentication failed. Invalid password.
 */

exports.authenticate = (req, res) => {
  // Validate request
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: 'Content can not be empty!',
      isSuccess: false,
    });
  }

  // Authenticates a User

  const user = new User({
    login: req.body.login,
    password: req.body.password,
    fcmToken: req.body.fcmToken,
  });
  User.authenticate(user, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * /user/logout:
 *   post:
 *     tags:
 *       - Users
 *     name: Logouts a user.
 *     summary: Removes the refresh token.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add token properties in JSON format.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *         required:
 *           - token
 *     responses:
 *       200:
 *         description: access token
 *       401:
 *         description: Enter a refresh token.
 *       403:
 *         description: Refresh Token Invalid.
 */

exports.logout = (req, res) => {
  // Validate request
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: 'Content can not be empty!',
      isSuccess: false,
    });
  }

  // Authenticates a token
  User.logout(req.body.token, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * /user/refresh:
 *   post:
 *     tags:
 *       - Users
 *     name: JWT Refresh Token
 *     summary: Genrate a new refresh token.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add token properties in JSON format.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             token:
 *               type: string
 *         required:
 *           - token
 *     responses:
 *       200:
 *         description: access token
 *       401:
 *         description: Refresh token cannot be empty.
 *       403:
 *         description: Refresh Token Invalid.
 */

exports.refreshToken = (req, res) => {
  // Validate request
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: 'Content can not be empty!',
      isSuccess: false,
    });
  }

  const user = new User({
    login: req.body.login,
    authId: req.body.token,
  });

  // Authenticates a User
  User.refreshToken(user, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * /user/changePassword:
 *   post:
 *     tags:
 *       - Users
 *     name: Update Password
 *     summary: Changes the password of the existing user.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add user and password properties in JSON format.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             login:
 *               type: string
 *             password:
 *               type: string
 *               format: password
 *             newPassword:
 *               type: string
 *               format: password
 *         required:
 *           - login
 *           - password
 *           - newPassword
 *     responses:
 *       200:
 *         description: Password Updated Succesfully.
 *       404:
 *         description: Username does not exist.
 *       401:
 *         description: Authentication failed. Invalid password.
 */

exports.updatePassword = (req, res) => {
  // Validate request
  if (req.body.constructor === Object && Object.keys(req.body).length === 0) {
    return res.status(400).send({
      message: 'Content can not be empty!',
      isSuccess: false,
    });
  }

  const user = new User({
    login: req.body.login,
    password: req.body.password,
    // newPassword: req.body.newPassword,
  });

  User.updatePassword(user, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * path:
 *  /user/details:
 *    get:
 *      summary: Get User's details
 *      security:
 *        - bearerAuth: []
 *      tags: [Users]
 *      parameters:
 *        - in: query
 *          name: uuid
 *          required: true
 *          description: The UUID of the user to get the details.
 *          type: string
 *      responses:
 *       200:
 *         description: User deactivated Succesfully.
 *       404:
 *         description: Username does not exist.
 *       500:
 *         description: Internal Server Error.
 */

exports.getUserDetails = (req, res) => {
  // Validate request
  const { uuid } = req.query;
     

  User.getUserDetails(uuid, (err, data) => {
    if (err) {
      res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } else return res.status(200).send(data);
  });
};

/**
 * @swagger
 * path:
 *  /user/remove:
 *    get:
 *      summary: Get User's details
 *      security:
 *        - bearerAuth: []
 *      tags: [Users]
 *      parameters:
 *        - in: query
 *          name: uuid
 *          required: true
 *          description: The UUID of the user to get the details.
 *          type: string
 *      responses:
 *       200:
 *         description: User details Succesfully.
 *       404:
 *         description: Username does not exist.
 *       500:
 *         description: Internal Server Error.
 */

exports.remove = function (req, res, next) {
  // Validate request
  const { uuid } = req.query;
  if (!uuid) {
    return res.status(400).send({
      message: 'UUID can not be empty! It must be included as query parameter',
      isSuccess: false,
    });
  }

  User.remove(uuid, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};




/**
 * @swagger
 * path:
 *  /user/verify:
 *    get:
 *      summary: Get User's details
 *      security:
 *        - bearerAuth: []
 *      tags: [Users]
 *      parameters:
 *        - in: query
 *          name: login
 *          required: true
 *          description: The login of the user to verify.
 *          type: string
 *      responses:
 *       200:
 *         description: User deactivated Succesfully.
 *       404:
 *         description: Username does not exist.
 *       500:
 *         description: Internal Server Error.
 */


 exports.verify = (req, res) => {
  // Validate request
  const { login } = req.query;
  const { phonenumber } = req.query;
  if (!login && !phonenumber ) {
    return res.status(400).send({
      message: 'Login or phonenumber cannot be empty! It must be included as query parameter',
      isSuccess: false,
    });
  }

  // Authenticates a User

  const user = new User({
    login: req.query.login,
    phonenumber: req.query.phonenumber,
  });

  const sql = 'CALL sp_check_login_credentials(:name, :value,:isPresent)';
  const user_data_binds = {
      name: req.query.login!==undefined?'login':'phonenumber',
      value: req.query.login!==undefined?req.query.login:req.query.phonenumber,
      isPresent: { dir: oracledb.BIND_OUT, type: oracledb.VARCHAR },
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = {};
  // const binds = Object.assign({}, cart_data, data);
  try {
      db.doConnect(async (err, connection) => {
          try {
              const result = await connection.execute(sql, user_data_binds, options);
              if (result != null) {
                if(result.outBinds.isPresent==='true'){
                   const accessToken = jwt.sign({ username: req.query.login!==undefined?req.query.login:req.query.phonenumber }, jwtKey, {
                    algorithm: 'HS256',
                    expiresIn: '15m',
                  });
                  res.status(200).send({ accessToken ,isSuccess: true, });
                }else{
                  res.status(200).send({ message:'No user found', isSuccess: false, });
                }
              }
              else {
                  res.status(200).send({ message: 'Unable to verify user', isSuccess: false });
              }
          } catch (err) {
              res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
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
  }
  catch (err) {
      res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
  }




  User.authenticate(user, (err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};




