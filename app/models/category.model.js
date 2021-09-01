const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');

const Category = function (category) {
  this.name = category.name;
  this.isActive = category.isActive;
};

function insertCategory(category, callback) {
  const sql = 'INSERT INTO CATEGORY (NAME,ISACTIVE,IS_PARENT,IMAGE_ID) values (:name, :isActive, :isParent,:imageId)';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection,
      sql,
      {
        name: category.name,
        isActive: category.isActive,
        isParent: 0,
        imageId: 0,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, { message: 'Category created successfully.', isSuccess: true }); // ALL IS GOOD
      },
    );
  });
}

function getAllCategories(callback) {
  const sql = 'Select id,name from CATEGORY where ISACTIVE=1 order by id asc';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection,
      sql,
      {}, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, { categories: res.rows }); // ALL IS GOOD
      },
    );
  });
}

function getCategSubCategory(callback) {
  // eslint-disable-next-line max-len
  const sql = 'SELECT c.id as "categoryId",c.name as "category", sc.id as "subCategoryId", sc.name as "subCategory" FROM category c LEFT JOIN sub_category sc ON c.id = sc.category_id and sc.isactive = 1 and c.isactive = 1 ORDER BY c.id ASC,sc.id ASC';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection,
      sql,
      {}, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, { categories: res.rows }); // ALL IS GOOD
      },
    );
  });
}

function getSubCtgryByCtgryName(categoryId, callback) {
  const sql = 'Select id,name from SUB_CATEGORY where ISACTIVE=1 and category_id = :categoryId order by id asc';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection,
      sql,
      {
        categoryId,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        if (res.rows.length === 0) {
          return callback(`No sub category found for ${categoryId}`);
        }
        return callback(null, { subCategories: res.rows }); // ALL IS GOOD
      },
    );
  });
}

Category.create = function (category, result) {
  insertCategory(category, (err, res) => {
    if (err) {
      console.log('Error in creating category');
      return result(err);
    }

    return result(null, res);
  });
};

Category.getCategories = function (result) {
  getAllCategories((err, res) => {
    if (err) {
      console.log('Error in creating category');
      return result(err);
    }

    return result(null, { isSuccess: true, ...res });
  });
};

Category.getSubCategoryByName = function (categoryId, result) {
  getSubCtgryByCtgryName(categoryId, (err, res) => {
    if (err) {
      console.log('Error in creating category');
      return result({ message: err, status: 404 });
    }

    return result(null, { isSuccess: true, ...res });
  });
};

Category.getCategoriesList = function (result) {
  getCategSubCategory((err, res) => {
    const categories = [];
    if (err) {
      console.log('Error in creating category');
      return result(err);
    }
    if (typeof res !== 'undefined' || res !== null) {
      // let category={};
      const categoryMap = new Map();
      const subCatgFlag = false;
      const tempCategory = '';
      const subCatArr = [];
      res.categories.forEach((element) => {
        const index = categories.findIndex((cat) => cat.categoryName === element.category);
        if (index !== -1) {
          if (element.subCategory !== null) {
            const subCatArr = categories[index].subCategory;

            subCatArr.push({
              subCategoryId: element.subCategoryId,
              subCategoryName: element.subCategory,
            });
            categories[index].subCategory = subCatArr;
          }
        } else {
          const category = {
            categoryId: element.categoryId,
            categoryName: element.category,
            subCategory:
              element.subCategory != null
                ? [{ subCategoryId: element.subCategoryId, subCategoryName: element.subCategory }]
                : [],
          };
          categories.push(category);
        }
      });
    }

    return result(null, { isSuccess: true, categories });
  });
};

module.exports = Category;
