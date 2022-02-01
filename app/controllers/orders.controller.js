const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const firebaseInstance = require('./firebase.controller');
const orderExpress = express();
const { templateString } = require('../utils/StringUtils');
const fs = require('fs');
const path = require('path');
const sendEmail = require('../utils/emailHelper.js');

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
  const sql = 'CALL sp_create_order(:userid, :razor_payment_id,:orderid)';
  const order_data_binds = {
    userid: req.body.user_id,
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

orderExpress.post('/getOrderSummary', async (req, res, next) => {
  const query = 'CALL sp_get_order_summary_byuser(:user_id,:jsonstring)';
  const order_summary_binds = {
    user_id: req.body.userId,
    jsonstring: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20000 },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(query, order_summary_binds, options);
        var parseObject = JSON.parse(result.outBinds.jsonstring);
        parseObject['isSuccess'] = true;
        res.status(200).send(parseObject);
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err.message });
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

orderExpress.post('/getOrderListByUserId', async (req, res, next) => {
  const query = 'CALL sp_get_order_details_by_userid(:users_id,:jsonstring)';
  const orderdetaiListBind = {
    users_id: req.body.UserId,
    jsonstring: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100000 },
  };
  const seriveOrderQuery = 'BEGIN sp_get_order_service_list_by_user_id(:users_id,:ref_cur_0); END;';
  const serviceOrderBind = {
    users_id: req.body.UserId,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        var images = await initAzureBlob();
        const result = await connection.execute(query, orderdetaiListBind, options);
        var parseObject = JSON.parse(result.outBinds.jsonstring);
        parseObject.UsersOrderList.forEach(orderdetail => {
          orderdetail.OrderItemList.forEach(orderitem => {
            var prodImage = images.find(x => x.metadata.ProductKey == orderitem.ProductImageId);
            orderitem['ProductImageUrl'] =
              'https://restorestoragev1.blob.core.windows.net/productimagesthumbnail/' +
              prodImage.name;
          });
        });
        const serviceOrderList = await dbSvc.simpleExecute(
          seriveOrderQuery,
          serviceOrderBind,
          1,
          'default'
        );
        parseObject['serviceOrderList'] = serviceOrderList.ref_cur_0[0];
        parseObject['isSuccess'] = true;
        res.status(200).send(parseObject);
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err.message, isSuccess: false });
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

orderExpress.post('/getOrderListByUserIdByOrderId', async (req, res, next) => {
  const query =
    'CALL sp_get_order_details_by_order_id_by_user(:users_id,:users_order_id,:jsonstring)';
  const orderdetaiListBind = {
    users_id: req.body.UserId,
    users_order_id: req.body.OrderId,
    jsonstring: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 100000 },
  };

  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        var images = await initAzureBlob();
        const result = await connection.execute(query, orderdetaiListBind, options);
        var parseObject = JSON.parse(result.outBinds.jsonstring);
        parseObject.UsersOrderList.forEach(orderdetail => {
          orderdetail.OrderItemList.forEach(orderitem => {
            var prodImage = images.find(x => x.metadata.ProductKey == orderitem.ProductImageId);
            orderitem['ProductImageUrl'] =
              'https://restorestoragev1.blob.core.windows.net/productimagesthumbnail/' +
              prodImage.name;
          });
        });

        parseObject['isSuccess'] = true;
        res.status(200).send(parseObject);
      } catch (err) {
        res.status(500).send({ errorCode: 500, errorMessage: err.message, isSuccess: false });
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

orderExpress.post('/getproductandserviceorders', async (req, res, next) => {
  const query = 'BEGIN sp_get_order_service_list_by_user_id(:users_id,:ref_cur_0); END;';
  const ordersbind = {
    users_id: req.body.UserId,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const serviceOrderList = await dbSvc.simpleExecute(query, ordersbind, 1, 'default');
    res.status(200).send({ isSuccess: true, serviceOrderList: serviceOrderList.ref_cur_0[0] });
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

orderExpress.post('/emailOrderPlaced', async (req, res, next) => {
  try {
    const email = req.body.login;
    const items = req.body.items;
    const elements = [];
    items.forEach(item => {
      elements.push('<tr>');
      elements.push(
        '<td width="75%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">'
      );
      elements.push(item.name);
      elements.push('</td>');
      elements.push(
        '<td width="25%" align="left" style="font-family: Open Sans, Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 24px; padding: 15px 10px 5px 10px;">'
      );
      elements.push(item.price);
      elements.push('</td>');
      elements.push('</tr>');
    });

    const replacement = {
      Order_Id: req.body.orderId,
      Total: req.body.orderTotal,
      Shipping_price: req.body.shipping,
      GST: req.body.gst,
      Item_List: elements.join(' '),
    };
    let subject = 'Order Placed';
    let htmlPath = path.join(__dirname, '..', 'templates', 'pages', 'order_placed.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let html = templateString(htmlContent, replacement);
    const emailResponse = await sendEmail({ to: email, subject, html });

    res.status(200).send(emailResponse);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

orderExpress.post('/emailOrderShipped', async (req, res, next) => {
  try {
    const email = req.body.login;

    const replacement = {
      NAME: email,
    };
    let subject = 'Order Shipped';
    let htmlPath = path.join(__dirname, '..', 'templates', 'pages', 'orderShipped.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let html = templateString(htmlContent, replacement);
    const emailResponse = await sendEmail({ to: email, subject, html });

    res.status(200).send(emailResponse);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

orderExpress.post('/emailOrderCancelled', async (req, res, next) => {
  try {
    const email = req.body.login;

    const replacement = {
      NAME: email,
    };
    let subject = 'Order Cancelled';
    let htmlPath = path.join(__dirname, '..', 'templates', 'pages', 'orderCancelled.html');
    let htmlContent = fs.readFileSync(htmlPath, 'utf8');
    let html = templateString(htmlContent, replacement);
    const emailResponse = await sendEmail({ to: email, subject, html });

    res.status(200).send(emailResponse);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

async function initAzureBlob() {
  const account = process.env.ACCOUNT_NAME || '';
  const accountKey = process.env.ACCOUNT_KEY || '';
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
  const blobServiceClient = new BlobServiceClient(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
  const containerClient = blobServiceClient.getContainerClient('restoreimagecontainer');
  let listOfImages = [];
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    listOfImages.push(blob);
  }
  return listOfImages;
}

module.exports = orderExpress;
