const express = require('express');
const bodyparser = require('body-parser');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');
const dbSvc = require('../config/db_svc.js');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const productRequestExpress = express();
productRequestExpress.use(bodyparser.json());

productRequestExpress.post('/addNewProductRequest', async (req, res, next) => {
  const addNewProductQuery =
    'CALL sp_add_new_product_request(:productsname, :productdescription, :conditionid,:userid,:statesid,:imagesid,:issuccess)';
  try {
    const options = {};
    const product_Request_Data_Binds = {
      productsname: req.body.ProductName,
      productdescription: req.body.Description,
      conditionid: req.body.ConditionId,
      userid: req.body.UsersId,
      statesid: req.body.StateId,
      imagesid: req.body.ImagesId,
      issuccess: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
    };

    db.doConnect(async (err, connection) => {
      const result = await connection.execute(
        addNewProductQuery,
        product_Request_Data_Binds,
        options
      );
      if (result.outBinds.issuccess == 1) {
        res.status(200).send({ message: 'Product was submitted successfully', isSuccess: true });
      } else {
        res.status(201).send({ message: 'Product could not be submitted', isSuccess: false });
      }
    });
  } catch (error) {
    res.status(201).send({ message: 'Product could not be submitted', isSuccess: false });
  }
});

productRequestExpress.get('/getRequestProduct/:usersId', async (req, res, next) => {
  const query = 'CALL sp_get_users_requested_products(:userid,:ref_cur_0)';
  const requestProductBind = {
    userid: req.params.usersId,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };

  try {
    const requestProductList = await dbSvc.simpleExecute(query, requestProductBind, 1, 'default');
    if (requestProductList.ref_cur_0[0].length > 0) {
      res
        .status(200)
        .send({ isSuccess: true, requestedProductList: requestProductList.ref_cur_0[0] });
    } else {
      res.status(200).send({ isSuccess: true, requestedProductList: [] });
    }
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

module.exports = productRequestExpress;
