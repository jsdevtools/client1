require('dotenv').load();
const express = require('express');
const passport = require('passport');
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
  // console.log('serializing', user);
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  // console.log('deserializing', obj);
  cb(null, obj);
});

const app = express();

app.set('port', process.env.PORT || 3001);
app.use(express.static(`${__dirname}/build`));

app.use(require('morgan')('combined', { stream: logger.stream }));
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(
  require('express-session')({
    domain: process.env.SESSION_DOMAIN || undefined,
    secret: 'keyboard cat',
    resave: true,
    saveUninitialized: true,
  })
);

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

/*
const checkAuthentication = (req, res, next) => {
  console.log('checking authentication');
  if (req.isAuthenticated()) {
    console.log('isauth');
    res.redirect(`/login/${req.params.app}/${req.params.provider}`);
  } else {
    console.log(`is not auth'd`);
    // not auth'd, choose provider
    next();
  }
};
*/

app.get('/', (req, res) => {
  console.log('checking authentication');
  // console.log('req:', req);
  if (req.isAuthenticated()) {
    console.log(`isauth'd`);
    res.send('Hello Client1!');
  } else {
    console.log(`is not auth'd`);
    res.redirect(
      `http://${process.env.SESSION_DOMAIN ? 'login' : ''}${process.env.SESSION_DOMAIN ||
        'localhost:3000'}/login/client1`
    );
  }
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`);
});
