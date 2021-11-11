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

appDataExpress.get('/getDashboardFlyers', async (req, res, next) => {
  var flyerList = [
    {
      flyerId: '1',
      flyerImageId: 'https://images.financialexpress.com/2020/01/1-75.jpg',
    },
    {
      flyerId: '2',
      flyerImageId: 'https://resize.indiatvnews.com/en/resize/newbucket/715_-/2020/01/real-me-new-year-sale-1578039133.jpg',
    },
    {
      flyerId: '3',
      flyerImageId: 'https://images.moneycontrol.com/static-mcnews/2019/10/Realme-Offers-770x433.jpg',
    },
    {
      flyerId: '4',
      flyerImageId: '',
    },
  ];
  res.status(200).send({ isSuccess: true, flyerList: flyerList });
});

module.exports = appDataExpress;
