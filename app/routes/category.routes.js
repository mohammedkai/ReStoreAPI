// module.exports = app => {
const express = require('express');

const app = express.Router();
const category = require('../controllers/category.controller.js');

// Create a new User
app.get('/add', category.create);
app.get('/all', category.getAllCategory);
app.get('/subcategory/', category.getSubCategory);
app.get('/list', category.listAllCategory);

module.exports = app;
