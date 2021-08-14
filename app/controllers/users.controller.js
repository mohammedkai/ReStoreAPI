const express = require('express');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const dbConfig = require('../config/db.config_cloud');
const dbSvc = require('../config/db_svc.js');
const userExpress = express();

userExpress.post('/submitOrder', async (req, res, next) => 
{
    const registersql = 'CALL sp_create_order(:user_id, :user_address_id, :order_id_status, :razor_payment_id)';
});


module.exports = userExpress;