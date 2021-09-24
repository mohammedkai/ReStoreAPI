const express = require('express');

const addressExpress = express();
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');

addressExpress.post('/addnewaddress', async (req, res, next) => {
  const sql = 'CALL sp_add_new_address(:addressid, :userid, :typeid,:cityid,:mypincode,:stateid,:primarymobileno,:secondarymobileno,:line_1,:line_2,:fullname,:isdefault)';
  const cart_data_binds = {
    addressid : req.body.address_id,
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
    isdefault:req.body.IsDefault,
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
    const allAddressList = await dbSvc.simpleExecute(query, address_data_binds, 1, 'default');
   
    res.status(200).send(allAddressList.ref_cur_0[0]);
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


addressExpress.get('/getUserAddressByID/:addressId', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_get_address_by_id(:addressid, :ref_cur_0)';
  const address_data_binds = {
    addressid: req.params.addressId,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const addressData = await dbSvc.simpleExecute(query, address_data_binds, 1, 'default');
    if (addressData.ref_cur_0[0].length > 0) {
      addressData.ref_cur_0[0][0]['isSuccess'] = true;
      res.status(200).send(addressData.ref_cur_0[0][0]);
    }
    else {
      res.status(200).send({isSuccess : false});
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

addressExpress.get('/deleteByAddressId/:addressId', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_address_disabled_by_id(:addressid)';
  const address_data_binds = {
    addressid: req.params.addressId
  };
  try {
    const addressupdatestatus = await dbSvc.simpleExecute(query, address_data_binds, 0, 'default');
    res.status(200).send({isSuccess : true});
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});


module.exports = addressExpress;
