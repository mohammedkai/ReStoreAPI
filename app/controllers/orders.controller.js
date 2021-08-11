const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');

const orderExpress = express();

orderExpress.post('/submitOrder', async (req, res, next) => {
  const sql = 'CALL sp_create_order(:user_id, :user_address_id, :order_id_status, :razor_payment_id)';
  const order_data_binds = {
    user_id: req.body.user_id,
    user_address_id: req.body.address_id,
    order_id_status: req.body.order_id_status,
    razor_payment_id: req.body.razor_payment_id
  };
    // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, order_data_binds, options);
        res.status(200).send({ message: 'Order has been submitted', isSuccess: true });
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess : false });
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
    res.status(500).send({ errorCode: 500, errorMessage: err,isSuccess : false  });
  }
});

module.exports = orderExpress;
