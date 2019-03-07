require('dotenv').load();
const util = require('util');
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const winston = require('winston');
const { Papertrail } = require('winston-papertrail');

const db = {
  users: {
    newUser: (userInfo, onSuccess, onFailure) => {
      try {
        // db.users.push(userInfo);
        onSuccess(userInfo);
      } catch (err) {
        onFailure(err);
      }
    },
  },
};

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

logger.stream = {
  write: (message, _encoding) => {
    logger.info(message);
  },
};

ptTransport.on('error', err => logger && logger.error(err));

ptTransport.on('connect', message => logger && logger.info(message));

passport.serializeUser((user, cb) => {
  logger.info(`serializing ${JSON.stringify(user)}`);
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  logger.info(`deserializing ${obj}`);
  cb(null, obj);
});

const app = express();

app.set('port', process.env.PORT || 3001);
app.use(express.static(`${__dirname}/build`));

app.use(morgan('combined', { stream: logger.stream }));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    store: new RedisStore({
      url: process.env.REDIS_URL,
    }),
    cookie: {
      domain: process.env.SESSION_DOMAIN || undefined,
      sameSite: false,
      secure: false,
    },
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
    path: '/',
  })
);

app.set('trust proxy', 1);

app.use(passport.initialize());
app.use(passport.session());

require('./providers/pass-google').setup(passport, app, db.users);
require('./providers/pass-github').setup(passport, app, db.users);

if (app.get('env') === 'development') {
  // development error handler
  // will print stacktrace
  app.use((err, req, res, _next) => {
    logger.warn(JSON.stringify(err));
    res.status(err.code || 500).json({
      status: 'error',
      message: err,
    });
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use((err, req, res, _next) => {
    logger.warn(JSON.stringify(err));
    res.status(err.status || 500).json({
      status: 'error',
      message: err.message,
    });
  });
}

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/', (req, res) => {
  logger.info(`/ checking authentication`);
  logger.info(`/ req: ${JSON.stringify(util.inspect(req))}`);
  if (req.isAuthenticated()) {
    logger.info(`/ isauth'd`);
    res.send(`
    <html>
      <body>
        Hello Client1!<br />
        <a href="/logout">Logout</a>
      </body>
    </html>
  `);
  } else {
    logger.info(`/ is not auth'd`);
    res.redirect(
      `${process.env.SESSION_DOMAIN ? 'https' : 'http'}://${
        process.env.SESSION_DOMAIN ? 'login' : ''
      }${process.env.SESSION_DOMAIN || 'localhost:3000'}/login/client1`
    );
  }
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`);
});
