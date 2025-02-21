require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const http=require('http')
const mongo=require('mongoose')
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;



//database connection
const db=require('./config/dbconnection.json')
mongo.connect(db.url).then(()=>{
    console.log('database connect')
}).catch(()=>console.log('database error'))


var indexRouter = require('./routes/index');
//userRoute
var usersRouter = require('./routes/users');

var app = express();

// Configurer le moteur de vue
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Assurez-vous que vous avez un dossier 'views'

// Exemple de route qui rend une vue
app.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    res.render('reset-password', { token }); // Le fichier 'reset-password.ejs' doit exister dans le dossier 'views'
});

// view engine setup
//app.set('views', path.join(__dirname, 'views'));
//app.set('view engine', 'jade');
app.use(cors({
  origin: 'http://localhost:3000', // Autoriser uniquement votre frontend React
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Autoriser les méthodes HTTP
  allowedHeaders: ['Content-Type', 'Authorization'], // Autoriser les en-têtes
}));
app.use(express.json());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


passport.use(
  new GoogleStrategy(
    {
       clientID: "388289107358-ud1mrbl4bp79ail2kafaftkd8v39632b.apps.googleusercontent.com",
       clientSecret: "OCSPX-_Z8VDIt6cmBNVyQnIdJqD0S_fcV4é",
      callbackURL: "http://localhost:3000/auth/google/callback", // Assurez-vous que cette URL est correcte
    },
    (accessToken, refreshToken, profile, done) => {
      return done(null, profile);
    }
  )
);




app.use('/', indexRouter);
app.use('/users', usersRouter);




// Route pour l'authentification Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback après l'authentification Google
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }), // Rediriger vers /login en cas d'échec
  (req, res) => {
    // Rediriger vers la page d'accueil ou une autre page après une connexion réussie
    res.redirect("http://localhost:3000/Home"); // Rediriger vers le frontend React
  }
);

// Route pour déconnecter l'utilisateur
app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("http://localhost:3000/login"); // Rediriger vers la page de login du frontend React
  });
});





// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

const server=http.createServer(app,console.log('run server'))



server.listen(5000)
  