var googleStrategy = require('passport-google-oauth2').Strategy;

function setup(passport, app, users) {
  passport.use(new googleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      scope: ['profile', 'email'],
      callbackURL: 'http://localhost:3000/login/google/return',
      passReqToCallback: true
    },
    function(req, accessToken, refreshToken, profile, cb) {
      console.log(profile);
      users.newUser(  
        {
          provider: profile.provider,
          providerID: profile.id,
          app: req.params.app,
          displayName: profile.displayName,
          email: profile.emails[0].value
        },
        (data) => console.log('created user via google strategy'),
        (err) => {
          if (err.code === '23505' ) {
            console.log('user exists');
          } else {
            console.log(err);
          }
        }
      );
      return cb(null, profile);
    }
  ));
}

module.exports = {
  setup: setup,
};