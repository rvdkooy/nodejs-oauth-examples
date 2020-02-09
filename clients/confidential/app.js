const express = require('express');
const bodyParser = require('body-parser');
var session = require('express-session');
const { Issuer, generators } = require('openid-client');

const createApp = function ({ baseUrl }) {
  const code_verifier = generators.codeVerifier();
  let _client;
  const app = express();
  app.set('views', __dirname + '/pages');
  app.set('view engine', 'ejs');
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(session({
    secret: 'keyboard cat' + baseUrl,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true },
    name: 'webapp2',
  }));

  const authSettings = {
    issuer_base_url: `https://demo.identityserver.io`,
    authorizationParams: {
      response_type: 'code',
    },
    base_url: baseUrl,
    client_id: 'interactive.confidential',
    client_secret: 'secret'
  };

  async function getClient() {
    if (!_client) {
      try {
        const issuer = await Issuer.discover(authSettings.issuer_base_url);
        _client = new issuer.Client(authSettings);
      } catch (err) {
        console.log(err)
      }
    }
    return _client
  }
  
  app.get('/', (req, res) => res.render('home', { user: req.session.user }));

  const protect = function () {
    return async function (req, res, next) {
      if (req.session.user) {
        return next();
      } else {
        req.session.returnTo = req.originalUrl;
        const client = await getClient();
        const authorizationUrl = client.authorizationUrl(Object.assign({
          scope: 'openid email profile',
          code_challenge: generators.codeChallenge(code_verifier),
          code_challenge_method: 'S256',
          redirect_uri: authSettings.base_url + '/callback',
          response_mode: 'form_post',
        }, authSettings));
        res.redirect(authorizationUrl);
      }
    };
  };

  app.post('/callback', async (req, res, next) => {
    try {
      const client = await getClient();
      const callbackParams = client.callbackParams(req);
      const tokenSet = await client.callback(authSettings.base_url + '/callback', callbackParams, { code_verifier }) // => Promise
      const userInfo = await client.userinfo(tokenSet.access_token);

      req.session.user = userInfo;
      req.session.claims = tokenSet.claims();
      req.session.tokens = tokenSet;

      res.redirect(req.session.returnTo || '/');
    } catch (err) {
      next(err);
    }
  });

  app.get('/protected', protect(), (req, res) => res.render('protected', { 
    user: req.session.user,
    claims: req.session.claims,
    tokens: req.session.tokens,
  }));
  
  app.get('/logout', (req, res) => {
    req.session.user = null;
    req.session.tokens = null;
    req.session.claims = null;
    res.redirect('/');
  });

  return app;
}

module.exports = createApp;