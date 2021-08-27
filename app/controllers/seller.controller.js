const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const sellerExpress = express();
const bodyparser = require('body-parser');
sellerExpress.use(bodyparser.json());
const Collect = require('@supercharge/collections')



sellerExpress.post('/registerSeller', async (req, res, next) => {
    const sql = 'CALL sp_add_new_seller(:seller_id, :seller_name,:seller_email,:seller_pwd,:phone_no,:store_name,:alt_pno,:seller_address,:is_email_verified,:is_phone_verified,:support_email)';
    const newseller_data_binds = {
        seller_id: req.body.sellerid,
        seller_name: req.body.sellername,
        seller_email: req.body.selleremail,
        seller_pwd: req.body.sellerpwd,
        phone_no: req.body.phoneno,
        store_name: req.body.storename,
        alt_pno: req.body.altpno,
        seller_address: req.body.selleraddress,
        support_email: req.body.supportemail,
        is_email_verified: req.body.isemailverified,
        is_phone_verified: req.body.isphoneverified
    };
    const options = { autoCommit: true };
    try {
        db.doConnect(async (err, connection) => {
            try {
                const result = await connection.execute(sql, newseller_data_binds, options);
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

sellerExpress.get('/getsellerlistings/:sellerId', async (req, res, next) => {
    await dbSvc.initialize();
    const sql = 'CALL sp_get_all_products_by_seller_id(:seller_id, :ref_cur_0)';
    const sellerproduct_data_binds = {
        seller_id: req.params.sellerId,
        ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
    };
    // const data = { cartid: 2, productid: 17, qty: 1 };
    const options = { autoCommit: true };
    // const binds = Object.assign({}, cart_data, data);
    try {
        const sellerListingsResult = await dbSvc.simpleExecute(sql, sellerproduct_data_binds, 1, 'default');
        if (sellerListingsResult.ref_cur_0[0].length > 0) {
            res.status(200).send({ sellerProductsList: sellerListingsResult.ref_cur_0[0], isSuccess: true });
        }
        else {
            res.status(200).send({ cartProducts: [], isSuccess: true });
        }
    } catch (error) {
        res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
});

sellerExpress.get('/getSellerOrders/:sellerId', async (req, res, next) => {
    await dbSvc.initialize();
    const sql = 'CALL sp_get_seller_orders_list(:seller_id, :ref_cur_0)';
    const sellerorder_data_binds = {
        seller_id: req.params.sellerId,
        ref_cur_0: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
    };
    // const data = { cartid: 2, productid: 17, qty: 1 };
    const options = { autoCommit: true };
    // const binds = Object.assign({}, cart_data, data);
    try {
        const sellerOrdersResult = await dbSvc.simpleExecute(sql, sellerorder_data_binds, 1, 'default');
        if (sellerOrdersResult.ref_cur_0[0].length > 0) {
            let uniqueOrderIds = sellerOrdersResult.ref_cur_0[0].map(item => item.OrderId)
                .filter((value, index, self) => self.indexOf(value) === index);
            let orders = [];
            uniqueOrderIds.forEach(orderid => {
                const productsFound = sellerOrdersResult.ref_cur_0[0].filter(element => element.OrderId == orderid);
                orders.push({ ordersid: orderid, orderdate: productsFound[0].OrderDate,userAddressID :productsFound[0].UserAddressID , OrderTotal: productsFound[0].OrderTotal, products: productsFound });
            });
            res.status(200).send({ sellerOrdersList: orders, isSuccess: true });
        }
        else {
            res.status(200).send({ sellerOrdersList: [], isSuccess: true });
        }
    } catch (error) {
        res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
});


module.exports = sellerExpress;
