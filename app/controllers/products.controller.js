const express = require('express');
const bodyparser = require('body-parser');
const oracledb = require('oracledb');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');
const dbSvc = require('../config/db_svc.js');
const { BlobServiceClient, StorageSharedKeyCredential } = require("@azure/storage-blob");
const productExpress = express();
productExpress.use(bodyparser.json());

async function initAzureBlob() {
  const account = process.env.ACCOUNT_NAME || "";
  const accountKey = process.env.ACCOUNT_KEY || "";
  const sharedKeyCredential = new StorageSharedKeyCredential(account, accountKey);
  const blobServiceClient = new BlobServiceClient(
    // When using AnonymousCredential, following url should include a valid SAS or support public access
    `https://${account}.blob.core.windows.net`,
    sharedKeyCredential
  );
  const containerClient = blobServiceClient.getContainerClient("restoreimagecontainer");
  let listOfImages = [];
  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: true })) {
    listOfImages.push(blob);
  }
  return listOfImages;
}


/**
 * @swagger
 * path:
 *  /products/getallproduct:
 *    get:
 *      summary: Returns the list of all available products.
 *      security:
 *        - bearerAuth: []
 *      tags: [Products]
 *      responses:
 *       200:
 *         description: Returns all the products.
 *       500:
 *         description: Internal Server Error.
 */
productExpress.get('/getAllProduct', async (req, res, next) => {
  try {
    await dbSvc.initialize();
    console.log('DB initialized.');
  } catch (err) {
    console.log(`${err.message}`);
    console.log(`${err.stack}`);
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
  const query = 'BEGIN sp_getallproducts(:ref_cur_0); END;';
  const binds = {
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const allProducts = await dbSvc.simpleExecute(query, binds, 1, 'default');
    console.log(`DB Object returned: ${JSON.stringify(allProducts)}`);
    res.status(200).send(allProducts.ref_cur_0[0]);
  } catch (err) {
    console.log(`${err.message}`);
    console.log(`${err.stack}`);
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

/**
 * @swagger
 * path:
 *  /products/getProductDetailsById/{prodId}:
 *    get:
 *      summary: Returns Product Details by sending product id.
 *      security:
 *        - bearerAuth: []
 *      tags: [Products]
 *      parameters:
 *        - in: path
 *          name: prodId
 *          required: true
 *          description: the product id of product.
 *          type: integer
 *      responses:
 *       200:
 *         description: Returns detail of product.
 *       500:
 *         description: Internal Server Error.
 */

productExpress.get('/getProductDetailsById/:prodId', async (req, res, next) => {
  const productId = req.params.prodId;
  if (productId !== null && productId !== 0) {
    try {
      await dbSvc.initialize();
      console.log('DB initialized.');
    } catch (err) {
      console.log(`${err.message}`);
      console.log(`${err.stack}`);
      res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
    const query = 'BEGIN sp_getproduct_details(:product_id_number, :ref_cur_0, :ref_cur_1); END;';
    const binds = {
      product_id_number: productId,
      ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
      ref_cur_1: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
    };
    try {
      const productDetails = await dbSvc.simpleExecute(query, binds, 2, 'default');
      if (productDetails != null) {
        var images = await initAzureBlob();
        var productImageUrl = [];
        images.forEach(element => {
          if (element.metadata.ProductKey == productDetails.ref_cur_0[0][0].IMAGE_ID) {
            productImageUrl.push('https://restorestoragev1.blob.core.windows.net/restoreimagecontainer/' + element.name);
          }
        });
        productDetails.ref_cur_0[0][0]['productImageUrl'] = productImageUrl;
        productDetails.ref_cur_0[0][0]['Specs'] = productDetails.ref_cur_1[0];
        res.status(200).send(productDetails.ref_cur_0[0][0]);
      }
      else {
        res.status(201).send({ errorCode: 201, errorMessage: 'No Data' });
      }
    } catch (err) {
      console.log(`${err.message}`);
      console.log(`${err.stack}`);
      res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
    }
  } else {
    res.status(500).send({ errorCode: 500, errorMessage: 'Invalid Product Id' });
  }
});

productExpress.get('/getAllProductBySubcategory/:subCategoryId', async (req, res, next) => {
  const subcatId = req.params.subCategoryId;
  await dbSvc.initialize();
  const query = 'BEGIN sp_getproduct_by_subcategory(:subcatid, :ref_cur_0); END;';
  const binds = {
    subcatid: subcatId,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const productList = await dbSvc.simpleExecute(query, binds, 1, 'default');
    let productimage = await initAzureBlob();
    let productImageUrl = [];
    let productsList = [];
    productList.ref_cur_0[0].forEach((element) => {
      productimage.forEach(imagedetail => {
        if (imagedetail.metadata.ProductKey == element.IMAGE_ID) {
          productImageUrl.push('https://restorestoragev1.blob.core.windows.net/restoreimagecontainer/' + imagedetail.name);
        }
        element['productImageUrl'] = productImageUrl;
      });
      productsList.push(element);
      productImageUrl = [];
    });
    res.status(200).send(productsList);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

productExpress.get('/getAllProductByCategoryId/:categoryId', async (req, res, next) => {
  const catid = req.params.categoryId;
  //await dbSvc.initialize();
  const query = 'BEGIN sp_getallproductsby_categoryid(:categoryid, :ref_cur_0); END;';
  const binds = {
    categoryid: catid,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const productListbyCategoty = await dbSvc.simpleExecute(query, binds, 1, 'default');
    res.status(200).send(productListbyCategoty.ref_cur_0[0]);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});

productExpress.get('/getSpecsBySubCatID/:subcategoryid', async (req, res, next) => {
  const subcatid = req.params.subcategoryid;
  //await dbSvc.initialize();
  const query = 'BEGIN sp_get_specs_by_subcat(:subcatid, :ref_cur_0); END;';
  const binds = {
    subcatid: subcatid,
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const specsInputList = await dbSvc.simpleExecute(query, binds, 1, 'default');
    res.status(200).send(specsInputList.ref_cur_0[0]);
  } catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err });
  }
});


productExpress.get('/sp_get_all_masters', async (req, res, next) => {
  const query = 'BEGIN sp_get_all_masters(:ref_cur_0,:ref_cur_1,:ref_cur_2,:ref_cur_3); END;';
  const binds = {
    ref_cur_0: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
    ref_cur_1: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
    ref_cur_2: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
    ref_cur_3: { type: oracledb.CURSOR, dir: oracledb.BIND_OUT },
  };
  try {
    const getallMasters = await dbSvc.simpleExecute(query, binds, 4, 'default');
    if (getallMasters != null && getallMasters.errorNum != 28547) {
      res.status(200).send({
        "Categories": getallMasters.ref_cur_0[0],
        "SubCategories": getallMasters.ref_cur_1[0],
        "ConditionMaster": getallMasters.ref_cur_2[0],
        "BrandMaster": getallMasters.ref_cur_3[0]
      });
    } else {
      res.status(201).send({ errorCode: 201, errorMessage: 'No data returned' });
    }
  } catch (err) {
    console.log(`${err.message}`);
    console.log(`${err.stack}`);
    res.status(500).send({ errorCode: 500, errorMessage: 'Internal Server Error' });
  }
});

productExpress.post('/listnewproduct', async (req, res, next) => {
  var productName = req.body.productName;
  var categoryId = req.body.categoryID;
  var subCategoryId = req.body.subCategoryID;
  var productPrice = req.body.price;
  var brandId = req.body.brandID;
  var stock = req.body.stock;
  var imageKey = req.body.imageKey;
  var warranty = req.body.warrantyInMonths;
  var desc = req.body.description;
  var modelNo = req.body.modelNo;
  var isDeliveryPaid = req.body.isDeliveryApplication;
  var deliveryCharge = req.body.deliveryCharge;
  var condition = req.body.conditionID;
  var sellerId = req.body.sellerID;
  const listProductQuery = 'CALL sp_add_new_product(:discountedprice, :brandid, :qty, :categoryid,:subcategoryid,:imageid,:productname,:manufacturerid,:warrantyinmonths,:modelno,:prodesc,:isdelchargeapplication,:deliverycharge,:conditionid,:sellersid,:productid)';

  const productbindings = {
    discountedprice: productPrice,
    brandid: brandId,
    qty: stock,
    categoryid: categoryId,
    subcategoryid: subCategoryId,
    imageid: imageKey,
    productname: productName,
    manufacturerid: 1,
    warrantyinmonths: warranty,
    modelno: modelNo,
    prodesc: desc,
    isdelchargeapplication: isDeliveryPaid,
    deliverycharge: deliveryCharge,
    conditionid: condition,
    sellersid: sellerId,
    productid: { type: oracledb.NUMBER, dir: oracledb.BIND_OUT },
  };
  const options = {};
  try {
    db.doConnect(async (err, connection) => {
      const result = await connection.execute(listProductQuery, productbindings, options);
      res.status(200).send({ message: 'Order has been submitted', isSuccess: true, ProductID: result.outBinds.productid });
    });
  }
  catch (err) {
    res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
  }

  //  const result = await connection.execute(listProductQuery, productbindings, options);
  // res.status(200).send({ message: 'Order has been submitted', isSuccess: true });
});

productExpress.post('/addProductSpecs', async (req, res, next) => {
  const addspecsquery = 'CALL sp_add_product_specs(:productid, :specid, :specvalue)';
  try {
    const options = {};
    var productSpecList = req.body;
    db.doConnect(async (err, connection) => {
      productSpecList.forEach(async (specItem) => {
        const productbindings =
        {
          productid: specItem.productId,
          specid: specItem.spec_Id,
          specvalue: specItem.specValue
        };
        const result = await connection.execute(addspecsquery, productbindings, options);
      });
      res.status(200).send({ message: 'Product spec submitted', isSuccess: true});
    });
  } catch (error) {
    res.status(500).send({ errorCode: 500, errorMessage: err, isSuccess: false });
  }
});


module.exports = productExpress;
