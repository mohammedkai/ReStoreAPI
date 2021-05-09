module.exports = (pool) => {
  /// /////////////////////////
  // INSTANTIATE THE DRIVER //
  /// /////////////////////////
  const oracledb = require('oracledb');

  /// ///////////////////
  // GET A CONNECTION //
  /// ///////////////////
  const doConnect = function (callback) {
    console.log(
      'INFO: Module getConnection() called - attempting to retrieve a connection using the node-oracledb driver',
    );

    pool.getConnection((err, connection) => {
      // UNABLE TO GET CONNECTION - CALLBACK WITH ERROR
      if (err) {
        console.log('ERROR: Cannot get a connection: ', err);
        return callback(err);
      }

      // If pool is defined - show connectionsOpen and connectionsInUse
      if (typeof pool !== 'undefined') {
        console.log(`INFO: Connections open: ${pool.connectionsOpen}`);
        console.log(`INFO: Connections in use: ${pool.connectionsInUse}`);
      }

      // Else everything looks good
      // Obtain the Oracle Session ID, then return the connection
      // eslint-disable-next-line no-use-before-define
      doExecute(
        connection,
        "SELECT SYS_CONTEXT('userenv', 'sid') AS session_id FROM DUAL",
        {},
        (err, result) => {
          // Something went wrong, releae the connection and return the error
          if (err) {
            console.log('ERROR: Unable to determine Oracle SESSION ID for this transaction: ', err);
            // eslint-disable-next-line no-use-before-define
            doRelease(connection);
            return callback(err);
          }

          // Log the connection ID (we do this to ensure the conncetions are being pooled correctly)
          console.log(
            'INFO: Connection retrieved from the database, SESSION ID: ',
            result.rows[0].SESSION_ID,
          );

          // Return the connection for use in model
          return callback(err, connection);
        },
      );
    });
  };

  /// //////////
  // EXECUTE //
  /// //////////
  const doExecute = function (connection, sql, params, callback) {
    connection.execute(
      sql,
      params,
      { autoCommit: true, outFormat: oracledb.OBJECT, maxRows: 10000 },
      (err, result) => {
        // Something went wrong - handle the data and release the connection
        if (err) {
          console.log('ERROR: Unable to execute the SQL: ', err);
          return callback(err);
        }

        // Return the result to the request initiator
        // console.log("INFO: Result from Database: ", result)
        return callback(err, result);
      },
    );
  };

  /// /////////
  // COMMIT //
  /// /////////
  const doCommit = (connection) => {
    connection.commit((err) => {
      if (err) {
        console.log('ERROR: Unable to COMMIT transaction: ', err);
      }
    });
  };

  /// ///////////
  // ROLLBACK //
  /// ///////////
  const doRollback = (connection, callback) => {
    connection.rollback((err) => {
      if (err) {
        console.log('ERROR: Unable to ROLLBACK transaction: ', err);
      }
      return callback(err, connection);
    });
  };

  /// ///////////////////////
  // RELEASE A CONNECTION //
  /// ///////////////////////
  const doRelease = (connection) => {
    connection.release((err) => {
      if (err) {
        console.log('ERROR: Unable to RELEASE the connection: ', err);
      }
    });
  };

  /// ///////////////////////////
  // EXPORT THE FUNCTIONALITY //
  /// ///////////////////////////
  module.exports.doConnect = doConnect;
  module.exports.doExecute = doExecute;
  module.exports.doCommit = doCommit;
  module.exports.doRollback = doRollback;
  module.exports.doRelease = doRelease;
};
