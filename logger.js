require('dotenv').load();

const winston = require('winston');
const { Papertrail } =
  process.env.REMOTE_LOGGING === 'true' ? require('winston-papertrail') : { Papertrail: undefined };

const ptTransport =
  process.env.REMOTE_LOGGING === 'true'
    ? new Papertrail({
        host: process.env.PAPERTRAIL_URL,
        port: process.env.PAPERTRAIL_PORT,
        logFormat: (level, message) => {
          return `[${level}] ${message}`;
        },
        timestamp: true,
        hostname: process.env.PAPERTRAIL_HOSTNAME,
        program: process.env.APPNAME,
      })
    : undefined;

const consoleLogger = new winston.transports.Console({
  level: process.env.LOG_LEVEL,
  timestamp() {
    return new Date().toString();
  },
  colorize: true,
});

// monkey pach papertrail to remove meta from log() args
const { log } = process.env.REMOTE_LOGGING === 'true' ? ptTransport : { log: undefined };
// eslint-disable-next-line func-names
if (process.env.REMOTE_LOGGING === 'true') {
  ptTransport.log = (level, msg, meta, callback) => {
    const cb = callback === undefined ? meta : callback;
    return log.apply(this, [level, msg, cb]);
  };
}

const logger =
  process.env.REMOTE_LOGGING === 'true'
    ? // eslint-disable-next-line new-cap
      new winston.createLogger({
        transports: [ptTransport],
      })
    : // eslint-disable-next-line new-cap
      new winston.createLogger({
        transports: [consoleLogger],
      });

logger.stream = {
  write: (message, _encoding) => {
    logger.info(message);
  },
};

if (process.env.REMOTE_LOGGING === 'true') {
  ptTransport.on('error', err => logger && logger.error(err));
  ptTransport.on('connect', message => logger && logger.info(message));
}

module.exports = {
  logger,
};
