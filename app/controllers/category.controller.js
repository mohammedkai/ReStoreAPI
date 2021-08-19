const Category = require('../models/category.model.js');

/**
 * @swagger
 * path:
 *  /category/add:
 *    get:
 *      summary: Add's a category
 *      security:
 *        - bearerAuth: []
 *      tags: [Category]
 *      parameters:
 *        - in: query
 *          name: name
 *          required: true
 *          description: The name of the new category.
 *          type: string
 *      responses:
 *       200:
 *         description: Category created successfully.
 *       500:
 *         description: Internal Server Error.
 */

exports.create = (req, res, next) => {
  // Validate request
  const { name } = req.query;
  if (!name) {
    return res.status(400).send({
      message: 'name can not be empty! It must be included as query parameter!',
      isSuccess: false,
    });
  }

  const category = new Category({
    name,
    isActive: 1,
  });

  // Creates new category
  Category.create(category, (err, data) => {
    if (err) {
      if (err.message.indexOf('unique') > -1) {
        return res.status(409).send({
          message: 'User already exist',
          isSuccess: false,
        });
      }
      next(err);
    } else return res.status(200).send(data);
  });
};

/**
 * @swagger
 * path:
 *  /category/all:
 *    get:
 *      summary: Returns the list of all available categories.
 *      security:
 *        - bearerAuth: []
 *      tags: [Category]
 *      responses:
 *       200:
 *         description: List of all categories.
 *       500:
 *         description: Internal Server Error.
 */

exports.getAllCategory = (req, res, next) => {
  // Validate request

  const category = new Category({});

  Category.getCategories((err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * path:
 *  /category/subCategory:
 *    get:
 *      summary: Returns the list of all available sub-categories of speicfied category.
 *      security:
 *        - bearerAuth: []
 *      tags: [Category]
 *      parameters:
 *        - in: query
 *          name: categoryId
 *          required: true
 *          description: The id of the category which contains sub-categories.
 *          type: integer
 *      responses:
 *       200:
 *         description: List of all sub-categories.
 *       404:
 *         description: Sub category not found.
 *       500:
 *         description: Internal Server Error.
 */

exports.getSubCategory = (req, res, next) => {
  // Validate request
  const { categoryId } = req.query;
  if (!categoryId) {
    return res.status(400).send({
      message: 'name can not be empty! It must be included as query parameter!',
      isSuccess: false,
    });
  }

  const category = new Category({});

  Category.getSubCategoryByName(categoryId, (err, data) => {
    if (err) {
      return res.status(err.status || 500).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

/**
 * @swagger
 * path:
 *  /category/list:
 *    get:
 *      summary: Returns the list of all available categories and their sub-categories .
 *      security:
 *        - bearerAuth: []
 *      tags: [Category]
 *      responses:
 *       200:
 *         description: List of all categories.
 *       500:
 *         description: Internal Server Error.
 */

exports.listAllCategory = (req, res, next) => {
  // Validate request

  const category = new Category({});

  Category.getCategoriesList((err, data) => {
    if (err) {
      return res.status(err.status).send({
        message: err.message || 'Some error occurred.',
        isSuccess: false,
      });
    } return res.status(200).send(data);
  });
};

