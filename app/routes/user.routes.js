// module.exports = app => {
const express = require('express');

const app = express.Router();
const user = require('../controllers/user.controller.js');

/* app.use((req, res, next) => {
  console.log('In User', Date.now());
  next();
}); */

// Create a new User
app.post('/register', user.create);
app.post('/login', user.authenticate);
app.post('/refresh', user.refreshToken);
app.post('/logout', user.logout);
app.post('/changePassword', user.updatePassword);
app.get('/details', user.getUserDetails);
app.get('/remove', user.remove);

module.exports = app;
