// Include all external dependencies
const oracledb = require('oracledb');

// Intialize variables
const numRows = 100;
let respArr = [];
let connectionObject;
async function initialize(envName) {
  await oracledb.createPool({
    user: process.env.DATABASEUSERNAME,
    password: process.env.DATABASEPASSWORD,
    connectString: process.env.DATABASECONNECTIONSTRING,
  });
}

async function close(poolAlias) {
  await oracledb.getPool(poolAlias).close();
}
// Function to iterate through all the rows fetched in the result set and resturn the same
async function fetchRowsFromRS(connection, resultSet, numRows) {
  // Get the rows
  try {
    const rows = await resultSet.getRows(numRows);
    // no rows, or no more rows, then close the result set
    if (rows.length === 0) {
      console.log('No rows returned');
      // doClose(connection, resultSet);
    } else if (rows.length > 0) {
      console.log(`Got ${rows.length} rows`);
      respArr = respArr.concat(rows);
      // Call the function recursively to get more rows
      await fetchRowsFromRS(connection, resultSet, numRows);
    }
    // Return the rows
    return respArr;
  } catch (err) {
    console.log(err);
  }
}

async function simpleExecute(statement, binds = [], numberOutCur, poolAlias, opts = {}) {
  try {
    opts.outFormat = oracledb.OBJECT;
    opts.autoCommit = true;
    connectionObject = await oracledb.getConnection(poolAlias);
    const finalResult = {};
    const result = await connectionObject.execute(statement, binds, opts);
    let promises = [];

    for (let idx = 0; idx < numberOutCur; idx++) {
      const refCurName = `ref_cur_${idx}`;
      promises.push(fetchRowsFromRS(connectionObject, result.outBinds[refCurName], numRows));
      const resultRows = await Promise.all(promises);
      respArr = [];
      finalResult[refCurName] = resultRows;
      promises = [];
    }
    return finalResult;
    // const values = await Promise.all(promises);
    // return values;
  } catch (error) {
    return error;
  } finally {
    if (connectionObject) {
      try {
        await connectionObject.close();
      } catch (err) {
        console.log(err);
      }
    }
  }
}

// Function to release the connection
function doRelease(connection) {
  connection.close(
    (err) => {
      if (err) {
        console.log(err.message);
      }
    },
  );
}

// Function to close the result set connection
function doClose(connection, resultSet) {
  resultSet.close(
    (err) => {
      if (err) { console.log(err.message); }
      doRelease(connection);
    },
  );
}

// Export functions
module.exports.simpleExecute = simpleExecute;
module.exports.initialize = initialize;
module.exports.close = close;
