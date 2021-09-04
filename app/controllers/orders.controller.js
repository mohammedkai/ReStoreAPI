const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const firebaseInstance = require('./firebase.controller');
const orderExpress = express();

orderExpress.get('/getOrderedItems/:orderId', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_get_ordereditems_by_order_id(:orderid,:ref_cur_0)';
  const ordered_data_binds = {
    orderid: req.params.orderId,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };

  try {
    const orderedProductList = await dbSvc.simpleExecute(query, ordered_data_binds, 1, 'default');
    if (orderedProductList.ref_cur_0[0].length > 0) {
      res.status(200).send({ isSuccess: true, productList: orderedProductList.ref_cur_0[0] });
    } else {
      res.status(201).send({ isSuccess: true, productList: [] });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

orderExpress.post('/submitOrder', async (req, res, next) => {
  const sql =
    'CALL sp_create_order(:userid, :user_address_id, :order_id_status, :razor_payment_id,:orderid)';
  const order_data_binds = {
    userid: req.body.user_id,
    user_address_id: req.body.address_id,
    order_id_status: req.body.order_id_status,
    razor_payment_id: req.body.razor_payment_id,
    orderid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = {};
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, order_data_binds, options);
        const orderlistsql = 'CALL sp_get_order_details(:userid, :orderid , :ref_cur_0)';
        const order_record_binds = {
          userid: req.body.user_id,
          orderid: result.outBinds.orderid,
          ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        };
        const orderdetails = await dbSvc.simpleExecute(
          orderlistsql,
          order_record_binds,
          1,
          'default'
        );

        if (orderdetails.ref_cur_0[0].length > 0) {
          orderdetails.ref_cur_0[0][0]['isSuccess'] = true;
          orderdetails.ref_cur_0[0][0]['message'] = 'Order has been submitted';
          JSON.stringify(orderdetails.ref_cur_0[0][0]);
          res.status(200).send(orderdetails.ref_cur_0[0][0]);
        } else {
          res.status(201).send({ message: 'Order Not Found', isSuccess: false });
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
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
  }
});

orderExpress.post('/getAllOrders', async (req, res, next) => {
  await dbSvc.initialize();
  const orderlistsql = 'CALL sp_get_order_details(:userid, :orderid , :ref_cur_0)';
  const orderproductlistsql = 'CALL sp_get_product_from_orders(:orderid, :ref_cur_0)';
  const order_list_binds = {
    userid: req.body.UserId,
    orderid: req.body.orderId,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  var orderListJson = [];
  try {
    const allOrders = await dbSvc.simpleExecute(orderlistsql, order_list_binds, 1, 'default');

    if (allOrders.ref_cur_0[0].length > 0) {
      for (const file of allOrders.ref_cur_0[0]) {
        const order_product_list_binds = {
          orderid: file.orderId,
          ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
        };
        const allorderProductsList = await dbSvc.simpleExecute(
          orderproductlistsql,
          order_product_list_binds,
          1,
          'default'
        );
        file['productList'] = allorderProductsList.ref_cur_0[0];
        orderListJson.push(file);
      }
      res
        .status(200)
        .send({ isSuccess: true, message: 'Records has been fetched', orderlist: orderListJson });
    } else {
      res
        .status(201)
        .send({ isSuccess: false, message: 'No Records Found', orderlist: orderListJson });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

module.exports = orderExpress;
