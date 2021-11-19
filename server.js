require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const user = require('./app/routes/user.routes');
const cors = require('cors');
const Logger = require('./app/config/loggerService');
const uuid = require('node-uuid');
const httpContext = require('express-http-context');
const chalk = require('chalk');
let logger = new Logger('app');
const cluster = require('cluster');
const worker = require('./app/routes/worker.route');
const fireBase = require('./app/controllers/firebase.controller');
const products = require('./app/controllers/products.controller');
const cart = require('./app/controllers/cart.controller');
const useraddress = require('./app/controllers/useraddress.controller');
const userorder = require('./app/controllers/orders.controller');
const payments = require('./app/controllers/payment.controller');
const userscontroller = require('./app/controllers/users.controller');
const sellercontroller = require('./app/controllers/seller.controller');
const appdatacontroller = require('./app/controllers/appdata.controller');
const productrequestcontroller = require('./app/controllers/productrequest.controller');
const supportcontroller = require('./app/controllers/support.controller');
const ip = require('ip');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { swaggerSetup } = require('./app/config/swaggerSetup');
const category = require('./app/routes/category.routes');
const authJwt = require('./app/middleware/authJwt');
const { auth } = require('firebase-admin');
const https = require('https');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const outhregistercontroller = require('./app/controllers/outhregister.controller.js');
const basicAuth = require('express-basic-auth');
const isLocal = false;
// catch unexpected exception becuase of which server get crashed
process.on('uncaughtException', uncaughtExc => {
  logger.error('Uncaught Excpetion', { message: uncaughtExc.message, stack: uncaughtExc.stack });
});

const app = express();
const workers = [];
//const options = {
//  key: fs.readFileSync('key.pem'),
//  cert: fs.readFileSync('cert.pem')
//};

/**
 * Setup number of worker processes to share port which will be defined while setting up server
 */

const setupWorkerProcesses = () => {
  // to read number of cores on system
  const numCores = require('os').cpus().length;
  console.log(chalk.green('Master cluster setting up ' + numCores + ' workers'));

  // iterate on number of cores need to be utilized by an application
  // current example will utilize all of them
  for (let i = 0; i < numCores; i++) {
    // creating workers and pushing reference in an array
    // these references can be used to receive messages from workers
    workers.push(cluster.fork());

    // to receive messages from worker process
    workers[i].on('message', message => {
      console.log(message);
    });
  }

  // process is clustered on a core and process id is assigned
  cluster.on('online', worker => {
    console.log(chalk.yellow('Worker ' + worker.process.pid + ' is listening'));
  });

  // if any of the worker process dies then start a new one by simply forking another one
  cluster.on('exit', (worker, code, signal) => {
    console.log(
      chalk.red(
        'Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal
      )
    );
    console.log(chalk.yellow('Starting a new worker'));
    workers.push(cluster.fork());
    // to receive messages from worker process
    workers[workers.length - 1].on('message', message => {
      console.log(message);
    });
  });
};

/**
 * Setup an express server and define port to listen all incoming requests for this application
 */

const setUpExpress = () => {
  app.use(bodyParser.json());

  // parse requests of content-type: application/x-www-form-urlencoded
  app.use(bodyParser.urlencoded({ extended: true }));

  //cors
  app.use(cors());

  app.use(httpContext.middleware);

  // simple route
  app.get('/', (req, res) => {
    res.json({ message: 'Welcome to mohammed application.' });
  });

  app.all('*', (req, res, next) => {
    httpContext.set('reqId', uuid.v1());
    logger.info('Incoming request', { url: req.url, mehtod: req.method });
    //to debug problem in a request
    logger.debug('Incoming request verbose', {
      headers: req.headers,
      query: req.query,
      body: req.body,
    });
    req.requestTime = new Date();
    res.on('finish', () => {
      console.log('Tracker', res.statusCode);
      console.log(req.requestTime);
    });

    next();
  });

  // setting up swagger
  const specs = swaggerJsdoc(swaggerSetup);
  app.use('/docs', swaggerUi.serve);
  app.get(
    '/docs',
    basicAuth({
      users: { admin: process.env.SWAGGERAUTHKEY },
      challenge: true,
      realm: 'Imb4T3st4pp'
    }),
    swaggerUi.setup(specs, { explorer: true })
  );
  app.get('/docs', swaggerUi.setup(specs, { explorer: true }));

  // adding routes
  app.use('/user', user);
  app.use('/users', userscontroller);
  app.use('/clustering', worker);
  app.use('/fireBase', fireBase);
  app.use('/category', category);
  app.use('/products', products);
  app.use('/carts', cart);
  app.use('/addresses', useraddress);
  app.use('/orders', userorder);
  app.use('/payments', payments);
  app.use('/sellers', sellercontroller);
  app.use('/apps' ,appdatacontroller);
  app.use('/request', productrequestcontroller);
  app.use('/oauthregister', outhregistercontroller);
  app.use('/support', supportcontroller);

  app.use((err, req, res, next) => {
    logger.error('Error occured', { message: err.message, stack: err.stack });
    res.status(500).send({
      message: 'Some error occurred.Kindly check logs',
      isSuccess: false,
    });
    next();
  });

  if (isLocal) {
    const sslServer = https.createServer(
      {
        key: fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem')),
      },
      app
    );
    sslServer.listen(process.env.PORT, () => {
      console.log('Secure App Runing on ' + process.env.PORT);
    });
  } else {
    //const server = https.createServer(options, app);
    // set port, listen for requests
    app.listen(process.env.PORT, () => {
      console.log(
        chalk.yellow(
          `Started server on => https://${ip.address()}:${process.env.PORT} for Process Id ${
            process.pid
          }`
        )
      );
    });
  }
};

/**
 * Setup server either with clustering or without it
 * @param isClusterRequired
 * @constructor
 */

const setupServer = isClusterRequired => {
  // if it is a master process then call setting up worker process
  if (isClusterRequired && cluster.isMaster) {
    setupWorkerProcesses();
  } else {
    // to setup server configurations and share port address for incoming requests
    setUpExpress();
  }
};
setupServer(false);
