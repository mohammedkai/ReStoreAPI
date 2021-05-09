/**
 * Database
 */

// AS PER DOCUMENTATION: https://github.com/oracle/node-oracledb/blob/master/examples/dbconfig.js
const oracledb = require('oracledb');
// const dbConfig = require('../config/db.config');
const dbConfig = require('../config/db.config_cloud');

// oracledb.connectionClass = dbconfig.connectionClass,

oracledb.createPool(
  {
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    connectString: dbConfig.CONNECTIONSTRING,
    poolMax: 44,
    poolMin: 2,
    poolIncrement: 5,
    poolTimeout: 4,
  },
  (err, pool) => {
    if (err) {
      console.log('ERROR: ', new Date(), `: createPool() callback: ${err.message}`);
      return;
    }

    require('./oracledb.js')(pool);
  },
);
