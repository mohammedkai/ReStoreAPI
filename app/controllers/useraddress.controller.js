const express = require('express');

const addressExpress = express();
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');

addressExpress.post('/addnewaddress', async (req, res, next) => {
  const sql = 'CALL sp_add_new_address(:userid, :typeid,:cityid,:mypincode,:stateid,:primarymobileno,:secondarymobileno,:line_1,:line_2,:fullname)';
  const cart_data_binds = {
    userid: req.body.User_ID,
    typeid: req.body.Address_Type,
    cityid: req.body.city_id,
    mypincode: req.body.pincode,
    stateid: req.body.state_id,
    primarymobileno: req.body.primary_mobileno,
    secondarymobileno: req.body.secondary_mobileno,
    line_1: req.body.line1,
    line_2: req.body.line2,
    fullname: req.body.Recipient_Name,
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
    userid: req.body.User_ID,
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
        line1: element.LINE1,
        line2: `${element.LINE2},\n${element.CITY_ID},${element.STATE_ID}\n` + 'India' + `\n${element.PINCODE}`,
        primary_mobileno: element.PRIMARY_MOBILENO,
        secondary_mobileno: element.SECONDARY_MOBILENO,
        city_id : element.CITY_ID,
        state_id : element.STATE_ID,
        pincode : element.PINCODE
      });
    });
    res.status(200).send(newAddressList);
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

addressExpress.post('/getLocation', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_get_location(:mypincode, :mycityid, :mystateid, :ref_cur_0)';
  const location_data_binds = {
    mypincode: req.body.pincode,
    mycityid: req.body.cityid,
    mystateid: req.body.stateid,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const locatinDetails = await dbSvc.simpleExecute(query, location_data_binds, 1, 'default');
    if (locatinDetails != null) {
      res.status(200).send({ isSuccess: true, locationDetails: locatinDetails.ref_cur_0[0][0] });
    }
    else {
      res.status(500).send({ isSuccess: false, locationDetails: [], errorMessage: 'No record found' });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});


module.exports = addressExpress;
