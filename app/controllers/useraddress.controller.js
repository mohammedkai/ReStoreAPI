const express = require('express');

const addressExpress = express();
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');

addressExpress.post('/sp_add_new_address', async (req, res, next) => {
  const sql = 'CALL sp_add_new_address(:userid, :type_id, :address,:city_id,:pincode,:state_id,:primary_mobileno,:secondary_mobileno,:line1,:line2)';
  const cart_data_binds = {
    userid: req.body.user_id,
    type_id: req.body.type_id,
    city_id: req.body.city_id,
    address: req.body.address,
    pincode: req.body.pincode,
    state_id: req.body.state_id,
    primary_mobileno: req.body.primary_mobileno,
    secondary_mobileno: req.body.secondary_mobileno,
    line1: req.body.line1,
    line2: req.body.line2,
  };
    // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { autoCommit: true };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, cart_data_binds, options);
        res.status(200).send({ message: 'Address has been added', isSuccess: true });
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

addressExpress.post('/getUserAddress', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_get_user_address(:userid, :ref_cur_0)';
  const address_data_binds = {
    userid: req.body.USER_ID,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const allProducts = await dbSvc.simpleExecute(query, address_data_binds, 1, 'default');
    const newAddressList = [];
    allProducts.ref_cur_0[0].forEach((element) => {
      newAddressList.push({
        address_id: element.ID,
        Recipient_Name: element.RECIPIENT_NAME,
        Address_Type: element.ADDRESS_TYPE,
        User_ID: element.USER_ID,
        Line1: element.ADDRESS,
        Line2: `${element.CITY_NAME },${ element.STATE_NAME }\n` + 'India' + `\n${ element.PINCODE}`,
        No1: element.PRIMARY_MOBILENO,
        No2: element.SECONDARY_MOBILENO,
      });
    });
    res.status(200).send(newAddressList);
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

module.exports = addressExpress;
