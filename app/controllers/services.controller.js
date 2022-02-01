const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const serviceExpress = express();

serviceExpress.get('/getallservices', async (req, res, next) => {
  const sql = 'CALL sp_get_service_list(:ref_cur_0)';
  const services_data_binds = {
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const servicesResult = await dbSvc.simpleExecute(sql, services_data_binds, 1, 'default');
    res.status(200).send({ serviceMasterList: servicesResult.ref_cur_0[0], isSuccess: true });
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

serviceExpress.post('/checkserviceavailablebypincode', async (req, res, next) => {
  const sql = 'CALL sp_check_service_availability_pincode(:userpincode,:userId,:isavailable)';
  const binds = {
    userpincode: req.body.Pincode,
    userId: req.body.userId,
    isavailable: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
  };
  const options = {};
  try {
    db.doConnect(async (err, connection) => {
      const result = await connection.execute(sql, binds, options);
      res.status(200).send({
        isSuccess: true,
        isServiceAvailable: result.outBinds.isavailable,
      });
    });
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
  }
});

serviceExpress.post('/createserviceorder', async (req, res, next) => {
  const query =
    'CALL sp_create_service_order(:userid,:isdatetimemarkedflexible,:isdatemarkedflexible,:istimemarkedflexible,:preferreddate,:preferredtime,:useraddressid,:selectedserviceid,:orderid)';
  const createorderbinds = {
    userid: req.body.userId,
    isdatetimemarkedflexible: req.body.isDateTimeMarkedFlexible,
    isdatemarkedflexible: req.body.isDateMarkedFlexible,
    istimemarkedflexible: req.body.isTimeMarkedFlexible,
    preferreddate: req.body.preferredDate,
    preferredtime: req.body.preferredTime,
    useraddressid: req.body.selectedAddressId,
    selectedserviceid: req.body.selectedServiceId,
    orderid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, createorderbinds, options);
        res.status(200).send({ isSuccess: true, orderId: result.outBinds.orderid });
      } catch (err) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: err.message });
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
    res.status(500).send({ errorCode: 500, errorMessage: err.message });
  }
});

serviceExpress.post('/updateserviceorder', async (req, res, next) => {
  const query =
    'CALL sp_update_order_details(:userid,:orderid,:paymentid,:currentpaymentstateid,:razorpaypaymentid)';
  const updateorderbinds = {
    userid: req.body.userId,
    orderid: req.body.orderId,
    paymentid: req.body.paymentId,
    currentpaymentstateid: req.body.paymentStateId,
    razorpaypaymentid: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, updateorderbinds, options);
        res
          .status(200)
          .send({ isSuccess: true, razorpayPaymentId: result.outBinds.razorpaypaymentid });
      } catch (err) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: err.message });
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
    res.status(500).send({ errorCode: 500, errorMessage: err.message });
  }
});

module.exports = serviceExpress;
