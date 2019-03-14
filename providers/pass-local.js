const LocalStrategy = require('passport-local').Strategy;

const setup = (passport, _app, _users) => {
  passport.use(
    'local',
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password',
        passReqToCallback: true,
        // session: true,
      },
      (req, username, password, done) => {
        /*
        User.findOne({ username: username }, function (err, user) {
          if (err) { return done(err); }
          if (!user) { return done(null, false); }
          if (!user.verifyPassword(password)) { return done(null, false); }
          return done(null, user);
        });
        */
        console.log('username:', username);
        console.log('password:', password);
        return done(null, {
          provider: 'local',
          id: 'id',
          name: 'name',
          username,
          user: username,
          email: username,
          photo: 'tbd',
        });
      }
    )
  );
};

module.exports = {
  setup,
};
