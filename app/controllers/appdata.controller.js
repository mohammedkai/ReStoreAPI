const express = require('express');
const bodyparser = require('body-parser');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');
const dbSvc = require('../config/db_svc.js');
const appDataExpress = express();
appDataExpress.use(bodyparser.json());
const axios = require('axios');

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
      flyerImageId: 'https://restorestoragev1.blob.core.windows.net/appimages/flyer1.png',
    },
    {
      flyerId: '2',
      flyerImageId: 'https://restorestoragev1.blob.core.windows.net/appimages/flyer2.png',
    },
    {
      flyerId: '3',
      flyerImageId: 'https://restorestoragev1.blob.core.windows.net/appimages/flyer3.png',
    },
    {
      flyerId: '4',
      flyerImageId: 'https://restorestoragev1.blob.core.windows.net/appimages/flyer4.png',
    },
  ];
  res.status(200).send({ isSuccess: true, flyerList: flyerList });
});

appDataExpress.get('/appversion', async (req, res, next) => {
  axios
    .get('https://imagefunctions20211106192815.azurewebsites.net/api/app/getversion')
    .then(function (response) {
      // handle success
      res.status(200).send(response.data);
      console.log(response);
    })
    .catch(function (error) {
      // handle error
      res.status(200).send({ isSuccess: false });
    });
});

module.exports = appDataExpress;
