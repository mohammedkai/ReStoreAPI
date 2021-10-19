const express = require('express');
const bodyparser = require('body-parser');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');
const dbSvc = require('../config/db_svc.js');
const appDataExpress = express();
appDataExpress.use(bodyparser.json());

appDataExpress.get('/getFaqList', async (req, res, next) => {
  const faqlistquery = 'CALL sp_getall_faqs(:jsonstring)';
  const faqlistquerybinds = {
    jsonstring: { dir: oracledb.BIND_OUT, type: oracledb.STRING, maxSize: 20000 },
  };
  const options = { autoCommit: true };
  try {
    db.doConnect(async (err, connection) => {
      try {
        const result = await connection.execute(faqlistquery, faqlistquerybinds, options);
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

module.exports = appDataExpress;
