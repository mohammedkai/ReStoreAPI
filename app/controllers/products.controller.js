const express = require('express');
const bodyparser = require('body-parser');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');
const dbSvc = require('../config/db_svc.js');

const productExpress = express();
productExpress.use(bodyparser.json());

/**
 * @swagger
 * path:
 *  /products/getallproduct:
 *    get:
 *      summary: Returns the list of all available products.
 *      security:
 *        - bearerAuth: []
 *      tags: [Products]
 *      responses:
 *       200:
 *         description: Returns all the products.
 *       500:
 *         description: Internal Server Error.
 */
productExpress.get('/getAllProduct', async (req, res, next) => {
  try {
    await dbSvc.initialize();
    console.log('DB initialized.');
  } catch (err) {
    console.log(`${err.message}`);
    console.log(`${err.stack}`);
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
  const query = 'BEGIN sp_getallproducts(:ref_cur_0); END;';
  const binds = {
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const allProducts = await dbSvc.simpleExecute(query, binds, 1, 'default');
    console.log(`DB Object returned: ${JSON.stringify(allProducts)}`);
    res.status(200).send(allProducts.ref_cur_0[0]);
  } catch (err) {
    console.log(`${err.message}`);
    console.log(`${err.stack}`);
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * path:
 *  /products/getProductDetailsById/{prodId}:
 *    get:
 *      summary: Returns Product Details by sending product id.
 *      security:
 *        - bearerAuth: []
 *      tags: [Products]
 *      parameters:
 *        - in: path
 *          name: prodId
 *          required: true
 *          description: the product id of product.
 *          type: integer
 *      responses:
 *       200:
 *         description: Returns detail of product.
 *       500:
 *         description: Internal Server Error.
 */

productExpress.get('/getProductDetailsById/:prodId', async (req, res, next) => {
  const productId = req.params.prodId;
  if (productId !== null && productId !== 0) {
    try {
      await dbSvc.initialize();
      console.log('DB initialized.');
    } catch (err) {
      console.log(`${err.message}`);
      console.log(`${err.stack}`);
      res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
    const query = 'BEGIN sp_getproduct_details(:product_id_number, :ref_cur_0, :ref_cur_1); END;';
    const binds = {
      product_id_number: productId,
      ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      ref_cur_1: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
    };
    try {
      const productDetails = await dbSvc.simpleExecute(query, binds, 2, 'default');
      productDetails.ref_cur_0[0][0]['Specs'] = productDetails.ref_cur_1[0];
      res.status(200).send(productDetails.ref_cur_0[0][0]);
    } catch (err) {
      console.log(`${err.message}`);
      console.log(`${err.stack}`);
      res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
  } else {
    res.status(500).send({ errorCode: 500, errorMessage: 'Invalid Product Id' });
  }
});

productExpress.get('/getAllProductBySubcategory/:subCategoryId', async (req, res, next) => {
  const subcatId = req.params.subCategoryId;
  await dbSvc.initialize();
  const query = 'BEGIN sp_getproduct_by_subcategory(:subcatid, :ref_cur_0); END;';
  const binds = {
    subcatid: subcatId,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const productList = await dbSvc.simpleExecute(query, binds, 1, 'default');
    res.status(200).send(productList.ref_cur_0[0]);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

productExpress.get('/getAllProductByCategoryId/:categoryId', async (req, res, next) => {
  const catid = req.params.categoryId;
  await dbSvc.initialize();
  const query = 'BEGIN sp_getallproductsby_categoryid(:categoryid, :ref_cur_0); END;';
  const binds = {
    categoryid: catid,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const productListbyCategoty = await dbSvc.simpleExecute(query, binds, 1, 'default');
    res.status(200).send(productListbyCategoty.ref_cur_0[0]);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

module.exports = productExpress;
