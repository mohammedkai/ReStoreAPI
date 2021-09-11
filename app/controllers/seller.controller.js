const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const sellerExpress = express();
const bodyparser = require('body-parser');
sellerExpress.use(bodyparser.json());
const Collect = require('@supercharge/collections')
let refreshTokens = [];
const jwtKey = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_SECRET;
const jwt = require('jsonwebtoken');



sellerExpress.post('/registerSeller', async (req, res, next) => {
    const sql = 'CALL sp_add_new_seller(:seller_id, :seller_name,:seller_email,:seller_pwd,:phone_no,:store_name,:alt_pno,:seller_address,:is_email_verified,:is_phone_verified,:support_email)';
    const newseller_data_binds = {
        seller_id: req.body.sellerid,
        seller_name: req.body.sellername,
        seller_email: req.body.selleremail,
        seller_pwd: req.body.sellerpwd,
        phone_no: req.body.phoneno,
        store_name: req.body.storename,
        alt_pno: req.body.altpno,
        seller_address: req.body.selleraddress,
        support_email: req.body.supportemail,
        is_email_verified: req.body.isemailverified,
        is_phone_verified: req.body.isphoneverified
    };
    const options = { autoCommit: true };
    try {
        db.doConnect(async (err, connection) => {
            try {
                const result = await connection.execute(sql, newseller_data_binds, options);
                res.status(200).send({ message: 200, isSuccess: true });
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

sellerExpress.get('/getsellerlistings/:sellerId', async (req, res, next) => {
    await dbSvc.initialize();
    const sql = 'CALL sp_get_all_products_by_seller_id(:seller_id, :ref_cur_0)';
    const sellerproduct_data_binds = {
        seller_id: req.params.sellerId,
        ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
    };
    // const data = { cartid: 2, productid: 17, qty: 1 };
    const options = { autoCommit: true };
    // const binds = Object.assign({}, cart_data, data);
    try {
        const sellerListingsResult = await dbSvc.simpleExecute(sql, sellerproduct_data_binds, 1, 'default');
        if (sellerListingsResult.ref_cur_0[0].length > 0) {
            res.status(200).send({ sellerProductsList: sellerListingsResult.ref_cur_0[0], isSuccess: true });
        }
        else {
            res.status(200).send({ cartProducts: [], isSuccess: true });
        }
    } catch (error) {
        res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
});

sellerExpress.get('/getSellerOrders/:sellerId', async (req, res, next) => {
    await dbSvc.initialize();
    const sql = 'CALL sp_get_seller_orders_list(:seller_id, :ref_cur_0)';
    const sellerorder_data_binds = {
        seller_id: req.params.sellerId,
        ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
    };
    // const data = { cartid: 2, productid: 17, qty: 1 };
    const options = { autoCommit: true };
    // const binds = Object.assign({}, cart_data, data);
    try {
        const sellerOrdersResult = await dbSvc.simpleExecute(sql, sellerorder_data_binds, 1, 'default');
        if (sellerOrdersResult.ref_cur_0[0].length > 0) {
            let uniqueOrderIds = sellerOrdersResult.ref_cur_0[0].map(item => item.OrderId)
                .filter((value, index, self) => self.indexOf(value) === index);
            let orders = [];
            uniqueOrderIds.forEach(orderid => {
                const productsFound = sellerOrdersResult.ref_cur_0[0].filter(element => element.OrderId == orderid);
                orders.push({ ordersid: orderid, orderdate: productsFound[0].OrderDate,userAddressID :productsFound[0].UserAddressID , OrderTotal: productsFound[0].OrderTotal, products: productsFound });
            });
            res.status(200).send({ sellerOrdersList: orders, isSuccess: true });
        }
        else {
            res.status(200).send({ sellerOrdersList: [], isSuccess: true });
        }
    } catch (error) {
        res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
});


/**
 * @swagger
 * /sellers/login:
 *   post:
 *     tags:
 *       - Sellers
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

sellerExpress.post('/authenticate', async (req, res, next) => {
    const query = 'CALL SP_SELLER_AUTHENTICATE(:login, :password,:isauthenticate)';
    const {login} = req.body;
    const {password} = req.body;
    if(login===undefined || password===undefined){
        return res.status(400).send({ message:'Please enter login and password', isSuccess: false });
    }
    const options = {};
    seller_list_binds = {
        login: login,
        password: password,
        isauthenticate: { dir: oracledb.BIND_OUT, type: oracledb.VACHAR },
    };
  
    try {
      db.doConnect(async (err, connection) => {
        try {
          const result = await connection.execute(query, seller_list_binds, options);
          if(result.outBinds.isauthenticate==='true'){
            const accessToken = jwt.sign({ username: login }, jwtKey, {
                algorithm: 'HS256',
                expiresIn: '15m',
              });
          
              const refreshToken = jwt.sign({login }, refreshTokenSecret, {
                algorithm: 'HS256',
                expiresIn: '30m',
              });
              refreshTokens.push(refreshToken);

              res.status(200).send({  message: 'Authenticated Successfully',
              isSuccess: true,
              accessToken,
              refreshToken, });

          }else{
            res.status(401).send({isSuccess: false,message:'Invalid credentials'});
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

  /**
 * @swagger
 * /sellers/refresh:
 *   post:
 *     tags:
 *       - Sellers
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

  sellerExpress.post('/refresh', async (req, res, next) => {
    const {login} = req.body;
    const {token} = req.body;
    if(login===undefined || token===undefined){
        return res.status(400).send({ message:'Please enter proper credentials', isSuccess: false });
    }
    try {
        if (!token) {
            return res.status(401).send({ message: 'Refresh token cannot be empty.', isSuccess: false });
          }
        
          if (!refreshTokens.includes(token)) {
            return res.status(403).send({ message: 'Refresh Token Invalid.', isSuccess: false });
          }
        
          jwt.verify(token, refreshTokenSecret, (err, response) => {
            if (err) {
              return res.status(400).send({ message: 'Refresh Token Invalid.', isSuccess: false });
            }
        
            const accessToken = jwt.sign({ username: login }, jwtKey, { algorithm: 'HS256', expiresIn: '20m' });
        
            res.status(200).send({
              message: 'New Refresh Token',
              isSuccess: true,
              accessToken,
            });
        });
    } catch (err) {
      res.status(500).send({ errorCode: 500, errorMessage: err });
    }
  });


  /**
 * @swagger
 * /sellers/logout:
 *   post:
 *     tags:
 *       - Sellers
 *     name: Logouts a selller.
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


  sellerExpress.post('/logout', async (req, res, next) => {
    const {token} = req.body;
    if(token===undefined){
        return res.status(400).send({ message:'Please enter proper credentials', isSuccess: false });
    }
    try {
        if (!token) {
            res.status(401).send({ message: 'Refresh token cannot be empty.', isSuccess: false });
          }
        
          if (!refreshTokens.includes(token)) {
            res.status(403).send({ message: 'Refresh Token Invalid.', isSuccess: false });
          }
          refreshTokens = refreshTokens.filter((t) => t !== token);
          res.status(200).send({ message: 'Logout successful',isSuccess: true });
    } catch (err) {
      res.status(500).send({ errorCode: 500, errorMessage: err });
    }
  });


  /**
 * @swagger
 * /sellers/changePassword:
 *   post:
 *     tags:
 *       - Sellers
 *     name: Update Password
 *     summary: Changes the password of the existing seller.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add seller and password properties in JSON format.
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


  sellerExpress.post('/changePassword', async (req, res, next) => {
    const query = 'CALL SP_UPDATE_SELLER_PASSWORD(:login, :password,:newPassword,:out_message)';
    const {login} = req.body;
    const {password} = req.body;
    const {newPassword} = req.body;
    if(login===undefined || password===undefined || newPassword===undefined){
        return res.status(400).send({ message:'Please enter login and password', isSuccess: false });
    }
    const options = {};
    seller_list_binds = {
        login: login,
        password: password,
        newPassword:newPassword,
        out_message: { dir: oracledb.BIND_OUT, type: oracledb.VACHAR },
    };
  
    try {
      db.doConnect(async (err, connection) => {
        try {
          const result = await connection.execute(query, seller_list_binds, options);
          if(result.outBinds.out_message==='true'){
              res.status(200).send({  message: 'Password updated successfully',isSuccess: true});
          }else{
            res.status(401).send({isSuccess: false,message:'Invalid credentials'});
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


module.exports = sellerExpress;
