require('dotenv').load();

const express = require('express');
const passport = require('passport');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { logger } = require('./logger');

const db = {
  users: {
    newUser: (userInfo, onSuccess, onFailure) => {
      try {
        onSuccess(userInfo);
      } catch (err) {
        onFailure(err);
      }
    },
  },
};

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((obj, cb) => {
  cb(null, obj);
});

const app = express();
app.set('port', process.env.PORT || 3001);
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

/*
  Passport providers.
*/
require('./providers/pass-google').setup(passport, app, db.users);
require('./providers/pass-github').setup(passport, app, db.users);
require('./providers/pass-local').setup(passport, app, db.users);

/*
  In development: Print stack trace on errors; also log URLs of all requests
  In production: Don't print stack trace on errors; also don't log URLs of all requests
*/
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
  // will log urls
  app.use((req, _res, next) => {
    logger.info(`req.url: ${req.url}`);
    next();
  });
} else {
  // production error handler
  // no stacktraces leaked to user
  app.use((err, req, res, _next) => {
    logger.warn(JSON.stringify(err.message));
    res.status(err.status || 500).json({
      status: 'error',
      message: err.message,
    });
  });
}

/*
  Gets called when trying to access protected resource.
  If not authenticated, redirects to /logout
  /logout will delete session info if it exists, then redirect to /login
*/
const checkAuthentication = (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.redirect('/logout');
  } else {
    next();
  }
};

/*
  Log the user out by destroying session info.
  Then redirect to login page.
*/
app.get('/logout', (req, res) => {
  if (req.session !== undefined) {
    req.session.destroy();
  }
  res.clearCookie('user');
  if (process.env.APP_LOGIN_PAGE === 'true') {
    res.redirect(`/login`);
  } else {
    res.redirect(
      `${process.env.SESSION_DOMAIN ? 'https' : 'http'}://${
        process.env.SESSION_DOMAIN ? 'login' : ''
      }${process.env.SESSION_DOMAIN || 'localhost:3000'}/login/client1`
    );
  }
});

/*
  Prompt user to login.
*/
app.get('/login', (req, res, _next) => {
  res.sendFile(path.join(__dirname, 'client1', 'build', 'index.html'));
});
app.get('/loginxxx', (req, res) => {
  return res.send(`
    <html>
      <head>
          <title>Client1 Login</title>
      </head>
      <body>
      <h1>Login</h1>
        Hello! Choose provider to log into Client1.<br />
        <a href="/login/${req.params.app}/github">Github</a><br />
        <a href="/login/${req.params.app}/google">Google</a><br />
        <h3>Local</h3>
        <form action='${process.env.SESSION_DOMAIN ? 'https' : 'http'}://${
    process.env.SESSION_DOMAIN ? 'login' : ''
  }${process.env.SESSION_DOMAIN || 'localhost:3000'}/login/client1/local' method='post'>
          <div>
            <label for='email'>Email:</label><br/>
            <input type='text' name='email' id='email' require>
          </div>
          <br/>
          <div>
            <label for='pass'>Password:(8 characters minimum)</label><br/>
            <input type='password' name='password' id='pass' minlength='8' required>
          </div>
          <br/>
          <input type='submit' value='Login'><br/>
        </form>
      </body>
    </html>
  `);
});

/*
  If static asset, serve static asset. 
  Don't serve index.html, that gets served only if authenticated.
  If not static asset, then next().
*/
app.use(express.static(path.join(__dirname, 'client1', 'build'), { index: false }));

/*
  Not static asset.
  Check if authenticated:
    True: Serve react app.
    False: Will redirect to login page
*/
app.get('*', checkAuthentication, (req, res, _next) => {
  res.cookie('user', req.user, { path: '/', secure: false });
  res.sendFile(path.join(__dirname, 'client1', 'build', 'index.html'));
});

app.listen(app.get('port'), () => {
  console.log(`Node app is running at localhost:${app.get('port')}`);
});
