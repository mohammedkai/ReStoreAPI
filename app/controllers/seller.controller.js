const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const sellerExpress = express();
const bodyparser = require('body-parser');
sellerExpress.use(bodyparser.json());


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
 
module.exports = sellerExpress;
