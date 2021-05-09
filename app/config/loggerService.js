/* eslint-disable */
const winston = require('winston');
const appRoot = require('app-root-path');
const httpContext = require('express-http-context');

const dateFormat = () => new Date(Date.now()).toUTCString();
class LoggerService {
  constructor(route) {
    this.log_data = null;
    this.route = route;
    const logger = winston.createLogger({
      transports: [
        new winston.transports.Console({
          level: 'debug',
          handleExceptions: true,
          json: false,
          colorize: true,
        }),
        new winston.transports.File({
          level: 'silly',
          filename: `${appRoot}/logs/${route}.log`,
          handleExceptions: true,
          json: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          colorize: true,
        }),
      ],
      exitOnError: false,
      format: winston.format.printf((info) => {
        const reqId = httpContext.get('reqId');
        let message = `${dateFormat()} | ${info.level.toUpperCase()} | ${route}.log | reqId: ${reqId} | ${info.message} | `;
        message = info.obj ? `${message }data:${JSON.stringify(info.obj)} | ` : message;
        message = this.log_data ? `${message }log_data:${JSON.stringify(this.log_data)} | ` : message;
        // message = reqId ? message + " reqId: " + reqId : message;
        return message;
      }),
    });
    this.logger = logger;
  }

  setLogData(log_data) {
    this.log_data = log_data;
  }

  async info(message) {
    this.logger.log('info', message);
  }

  async info(message, obj) {
    this.logger.log('info', message, {
      obj,
    });
  }

  async debug(message) {
    this.logger.log('debug', message);
  }

  async debug(message, obj) {
    this.logger.log('info', message, {
      obj,
    });
  }

  async debug(message, obj) {
    this.logger.log('debug', message, {
      obj,
    });
  }

  async error(message) {
    this.logger.log('error', message);
  }

  async error(message, obj) {
    this.logger.log('error', message, {
      obj,
    });
  }
}
module.exports = LoggerService;
