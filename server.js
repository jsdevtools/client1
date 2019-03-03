require('dotenv').load();
const express = require('express');
const winston = require('winston');
const { Papertrail } = require('winston-papertrail');

const ptTransport = new Papertrail({
  host: process.env.PAPERTRAIL_URL,
  port: process.env.PAPERTRAIL_PORT,
  logFormat: (level, message) => {
    return `[${level}] ${message}`;
  },
  timestamp: true,
  hostname: process.env.PAPERTRAIL_HOSTNAME,
  program: process.env.APPNAME,
});
const consoleLogger = new winston.transports.Console({
  level: process.env.LOG_LEVEL,
  timestamp() {
    return new Date().toString();
  },
  colorize: true,
});

// monkey pach papertrail to remove meta from log() args
const { log } = ptTransport;
// eslint-disable-next-line func-names
ptTransport.log = function(level, msg, meta, callback) {
  const cb = callback === undefined ? meta : callback;
  return log.apply(this, [level, msg, cb]);
};

// eslint-disable-next-line new-cap
const logger = new winston.createLogger({
  transports: [ptTransport, consoleLogger],
});

ptTransport.on('error', err => logger && logger.error(err));

ptTransport.on('connect', message => logger && logger.info(message));

const app = express();

app.set('port', process.env.PORT || 5000);
app.use(express.static(`${__dirname}/public`));

app.get('/', (request, response) => {
  response.send('Hello World!');
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`);
});
