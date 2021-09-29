const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const paymentExpress = express();
const Razorpay = require("razorpay");
const shortid = require("shortid");
const crypto = require("crypto");
const cors = require("cors");

var razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

var instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });

paymentExpress.get("/logo.svg", (req, res) => {
    res.sendFile(path.join(__dirname, "logo.svg"));
});

paymentExpress.post("/verification", (req, res) => {
    const secret = razorpay.RAZORPAY_KEY_SECRET;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update('order_Hjw3Tkk2JCIIma' + "|" + 'pay_Hjw3yMEWcUqFsO');
    let generatedSignature = hmac.digest('hex');
    let isSignatureValid = generatedSignature == "51b8bcb3882b613af6d347a5d07f67363c9b983e386a19912ff99a7b4d47ee30";
    console.log(req.body);
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    console.log(digest, req.headers["x-razorpay-signature"]);

    if (digest === req.headers["x-razorpay-signature"]) {
        console.log("request is legit");
        res.status(200).json({
            message: "OK",
        });
    } else {
        res.status(403).json({ message: "Invalid" });
    }
});

paymentExpress.post("/createRazorPayOrder", async (req, res) => {
    const payment_capture = req.body.payment_capture;
    const amount = req.body.amount;
    const currency = req.body.currency;

    const options = {
        amount,
        currency,
        receipt: shortid.generate(),
        payment_capture,
    };
    try {
        const response = await razorpay.orders.create(options);
        console.log(response);
        res.status(200).json({
            id: response.id,
            currency: response.currency,
            amount: response.amount,
            isSuccess: true
        });
    } catch (err) {
        res.status(500).send({ message: 500, isSuccess: false });
    }
});

paymentExpress.post('/addPaymentDetails', async (req, res, next) => {
    const sql = 'CALL sp_add_paymentdetails(:razorpaypaymentid, :razorpayorderid, :razorpaysignature, :paymentdetailid)';
    const order_data_binds = {
        razorpaypaymentid: req.body.razorpay_payment_id,
        razorpayorderid: req.body.razorpay_order_id,
        razorpaysignature: req.body.razorpay_signature,
        paymentdetailid: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
    };

    const hmac = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    hmac.update(order_data_binds.razorpayorderid + "|" + order_data_binds.razorpaypaymentid);
    let generatedSignature = hmac.digest('hex');
    let isSignatureValid = generatedSignature == order_data_binds.razorpaysignature;
    // const data = { cartid: 2, productid: 17, qty: 1 };
    const options = {};
    // const binds = Object.assign({}, cart_data, data);
    if (isSignatureValid) {
        try {
            db.doConnect(async (err, connection) => {
                try {
                    const result = await connection.execute(sql, order_data_binds, options);
                    res.status(200).send({ message: 'Details added', payment_id: result.outBinds.paymentdetailid, isSuccess: true });
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
    } else {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: err });
    }
});

paymentExpress.post('/getPaymentDetailsByPaymentId', async (req, res, next) => {
    try {
        const payment_id = req.body.paymentid;
        var response = await instance.payments.fetch(payment_id);
        res.status(200).send({ isSuccess: true, data: response });
    }
    catch (error) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: error });
    }
});

paymentExpress.post('/getPaymentDetailByOrderId', async (req, res, next) => {
    try {
        const order_id = req.body.orderid;
        var response = await instance.orders.fetch(order_id);
        res.status(200).send({ isSuccess: true, data: response });
    }
    catch (error) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: error });
    }
});

paymentExpress.post('/downloadInvoice', async (req, res, next) => {
    try {
        var response = await instance.invoices.issue(req.body.invoiceId)
        res.status(200).send({ isSuccess: true, data: response });
    }
    catch (error) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: error });
    }
});

paymentExpress.post('/orderAmountRefund', async (req, res, next) => {
    try {
        const options = {
            amount: req.body.amount
        };
        const razorpayResponse = await instance.payments.refund(req.body.paymentId,options)
        res.status(200).send({ isSuccess: true, data: razorpayResponse });
    }
    catch (error) {
        res.status(500).send({ errorCode: 500, isSuccess: false, errorMessage: error });
    }
});


paymentExpress.post('/getPaymentReleaseBySeller', async (req, res, next) => {
    const query =
      'CALL SP_GET_PAYMENT_RELEASE_BYSELLER(:seller_id,:months,:jsonstring)';
    const payment_summary_binds = {
      seller_id: req.body.sellerId,
      months: req.body.months,
      jsonstring: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20000 },
    };
    const options = { autoCommit: true };
    try {
      db.doConnect(async (err, connection) => {
        try {
          const result = await connection.execute(query, payment_summary_binds, options);
          var parseObject = JSON.parse(result.outBinds.jsonstring);
          parseObject["isSuccess"] = true;
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
      res.status(500).send({ errorCode: 500, errorMessage: err.message });
    }
  });

module.exports = paymentExpress;