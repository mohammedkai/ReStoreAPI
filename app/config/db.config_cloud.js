/*eslint-disable */
module.exports = {
  // HOST: "localhost",
  USER: process.env.DATABASEUSERNAME,
  PASSWORD: process.env.DATABASEPASSWORD,
  // CONNECTIONSTRING: 'restore_high',
  CONNECTIONSTRING: process.env.DATABASECONNECTIONSTRING
};
