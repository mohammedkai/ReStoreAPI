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
const ip = require("ip");
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const { swaggerSetup } = require('./app/config/swaggerSetup');
const category = require('./app/routes/category.routes');
const authJwt = require('./app/middleware/authJwt');

// catch unexpected exception becuase of which server get crashed
process.on('uncaughtException', (uncaughtExc) => {
    logger.error('Uncaught Excpetion',{message:uncaughtExc.message,stack:uncaughtExc.stack});
    });

const app = express();
const workers = [];

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
        workers[i].on('message', (message) => {
            console.log(message);
        });
    }

    // process is clustered on a core and process id is assigned
    cluster.on('online', (worker) => {
        console.log(chalk.yellow('Worker ' + worker.process.pid + ' is listening'));
    });

    // if any of the worker process dies then start a new one by simply forking another one
    cluster.on('exit', (worker, code, signal) => {
        console.log(chalk.red('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal));
        console.log(chalk.yellow('Starting a new worker'));
        workers.push(cluster.fork());
        // to receive messages from worker process
        workers[workers.length - 1].on('message', (message) => {
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
  app.get('/docs', swaggerUi.setup(specs, { explorer: true }));

  // adding routes
  app.use('/user',user);
  app.use('/clustering',worker);
  app.use('/fireBase',fireBase);
  app.use('/category',authJwt,category);

  app.use((err, req, res, next) => {
    logger.error('Error occured', { message: err.message, stack: err.stack });
    res.status(500).send({
      message: 'Some error occurred.Kindly check logs',
      isSuccess: false,
    });
    next();
  });

  // set port, listen for requests
  const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(chalk.yellow(`Started server on => http://${ip.address()}:${PORT} for Process Id ${process.pid}`));
});

};

/**
 * Setup server either with clustering or without it
 * @param isClusterRequired
 * @constructor
 */

const setupServer = (isClusterRequired) => {

    // if it is a master process then call setting up worker process
    if (isClusterRequired && cluster.isMaster) {
        setupWorkerProcesses();
    } else {
        // to setup server configurations and share port address for incoming requests
        setUpExpress();
    }
};

setupServer(true);
