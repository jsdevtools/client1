const GithubStrategy = require('passport-github').Strategy;

function setup(passport, app, users) {
  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scope: ['read:user', 'user:email'],
        callbackURL: 'http://localhost:3000/login/github/return',
        passReqToCallback: true,
      },
      (req, accessToken, refreshToken, profile, cb) => {
        console.log(profile);
        users.newUser(
          {
            provider: profile.provider,
            providerID: profile.id,
            app: req.params.app,
            displayName: profile.displayName,
            email: profile.emails[0].value,
          },
          _data => console.log('created user via github strategy'),
          err => {
            if (err.code === '23505') {
              console.log('user exists');
            } else {
              console.log(err);
            }
          }
        );
        return cb(null, profile);
      }
    )
  );
}

module.exports = {
  setup,
};
