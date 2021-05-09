const express = require('express');
const AsyncListController = require('../utils/workerCode');

const app = express.Router();
const asyncListController = new AsyncListController();

// const setRouter = (app) => {
/**
     * GET status
     */
app.get('/status', (req, res) => res.send({ status: 200 }));
app.route('/list').get(asyncListController.createList);

// gc route
app.route('/int-gc-clean').get((req, res) => {
  if (global.gc) {
    global.gc();
  } else {
    console.log('Garbage collection unavailable.  Pass --expose-gc when launching node to enable forced garbage collection.');
  }
  res.json({});
});

// app.use('/clustering', app);
// };

module.exports = app;
