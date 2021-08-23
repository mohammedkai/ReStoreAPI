const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");

const cartExpress = express();


async function initAzureBlob() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
  const blobServiceClient = new BlobServiceClient(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
  const containerClient = blobServiceClient.getContainerClient("restoreimagecontainer");
  let listOfImages = [];
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    listOfImages.push(blob);
  }
  return listOfImages;
}



/**
 * @swagger
 * /carts/addToCart:
 *   post:
 *     tags:
 *       - Cart
 *     name: Add Product to Cart
 *     summary: Adds product to cart against user.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add body to your cart.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             userid:
 *               type: integer
 *             product_id:
 *               type: integer
 *             quantity:
 *               type: integer
 *         required:
 *           - cart_id
 *           - product_id
 *           - quantity
 *     responses:
 *       200:
 *         description: Item added to cart
 *       500:
 *         description: Internal Server Error
 *       409:
 *         description: Something went wrong
 */

cartExpress.post('/addToCart', async (req, res, next) => {
  const sql = 'CALL sp_add_to_cart(:user_id, :productid, :qty, :cart_item_id)';
  const cart_data_binds = {
    user_id: req.body.user_id,
    productid: req.body.product_id,
    qty: req.body.quantity,
    cart_item_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { autoCommit: true };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, cart_data_binds, options);
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

/**
 * @swagger
 * /carts/getCartItems:
 *   post:
 *     tags:
 *       - Cart
 *     name: Get cart items
 *     summary: get all items which are in cart.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: add user id to get list of products.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             userid:
 *               type: integer
 *         required:
 *           - cart_id
 *     responses:
 *       200:
 *         description: carts items successfully returned
 *       500:
 *         description: Internal Server Error
 *       409:
 *         description: Something went wrong
 */

cartExpress.post('/getCartItems', async (req, res, next) => {
  await dbSvc.initialize();
  const query = 'CALL sp_get_cartitem_by_id(:userid, :ref_cur_0)';
  const cart_data_binds = {
    userid: req.body.user_id,
    ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
  };
  try {
    const cartProductList = [];
    const allProducts = await dbSvc.simpleExecute(query, cart_data_binds, 1, 'default');
    if (allProducts.ref_cur_0[0].length > 0) {
      var images = await initAzureBlob();
      allProducts.ref_cur_0[0].forEach((cartpros)=>{
        const imageresult = images.filter(image => image.metadata.ProductKey == cartpros.IMAGE_ID);
        cartpros["productImageUrl"] = [] ;
        cartpros["productImageUrl"].push('https://restorestoragev1.blob.core.windows.net/restoreimagecontainer/' + imageresult[0].name);
        cartProductList.push(cartpros);
      });
      res.status(200).send({ cartProducts: cartProductList, isSuccess : true });
    }
    else {
      res.status(500).send({ cartProducts: cartProductList, isSuccess : false });
    }


  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

cartExpress.post('/removeItemFromCart', async (req, res, next) => {
  const sql = 'CALL sp_remove_item_from_cart(:userid, :productid)';
  const cart_data_binds = {
    userid: req.body.user_id,
    productid: req.body.product_id,
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { autoCommit: true };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, cart_data_binds, options);
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

cartExpress.post('/updateQtyCart', async (req, res, next) => {
  const sql = 'CALL sp_update_product_cart_qty(:userid, :productid, :qty)';
  const cart_data_binds = {
    userid: req.body.user_id,
    productid: req.body.product_id,
    qty: req.body.quantity,
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { autoCommit: true };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, cart_data_binds, options);
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

cartExpress.post('/calculateCartValue', async (req, res, next) => {
  const sql = 'CALL sp_calculate_cart_value(:userid, :discountid, :cartvalue)';
  const cart_data_binds = {
    userid: req.body.user_id,
    discountid: req.body.discount_id,
    cartvalue: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
  };
  // const data = { cartid: 2, productid: 17, qty: 1 };
  const options = { autoCommit: true };
  // const binds = Object.assign({}, cart_data, data);
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(sql, cart_data_binds, options);
        res.status(200).send({ cart_value: result.outBinds.cartvalue, isSuccess: true });
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

module.exports = cartExpress;
