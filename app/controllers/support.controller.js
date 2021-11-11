const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const firebaseInstance = require('./firebase.controller');
const supportExpress = express();

supportExpress.post('/raiseTicket', async (req, res, next) => {
  const sql =
    'CALL sp_create_support_ticket(:ticketid, :request_by,:title,:ticketdescription,:orders_id,:users_id,:hasvalueadded)';
  const ticketBinds = {
    ticketid: req.body.ticketId,
    request_by: req.body.requestedBy,
    title: req.body.title,
    ticketdescription: req.body.ticketDescription,
    orders_id: req.body.orderId,
    users_id: req.body.userId,
    hasvalueadded: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = {};
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, ticketBinds, options);
        res.status(200).send({ isSuccess: true, response: result.outBinds.hasvalueadded });
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

module.exports = supportExpress;