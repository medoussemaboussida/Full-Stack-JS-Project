require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const http = require('http');
const mongo = require('mongoose');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require("passport-github2").Strategy;

// Connexion à la base de données
const db = require('./config/dbconnection.json');
mongo.connect(db.url).then(() => {
    console.log('✅ Database connectée');
}).catch(() => console.log('❌ Erreur de connexion à la database'));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

//  CORS - Unifier les origines
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5001"], // Autoriser frontend et back-office
    credentials: true,
}));

// Configurer le moteur de vue
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//  Configuration de session pour Passport
app.use(
    session({
      secret: "secret_key",
      resave: false,
      saveUninitialized: true,
      cookie: { secure: false }, // `secure: true` en production avec HTTPS
    })
  );
app.use(passport.initialize());
app.use(passport.session());

// Route pour reset-password avec rendu de la vue
app.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    res.render('reset-password', { token });
});

// Routes API
app.use('/', indexRouter);
app.use('/users', usersRouter);


//GITHUB CONFIG 
passport.use(
    new GithubStrategy(
      {


        clientID: process.env.GIT_CLIENT_ID,
        clientSecret: process.env.GIT_CLIENT_SECRET,
        callbackURL: "http://localhost:5000/auth/github/callback",
      },
      (accessToken, refreshToken, profile, done) => {
        return done(null, profile);
    }
    )
  );
  
  passport.serializeUser((user, done) => {
    done(null, user);
  });
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
  
//   app.get("/auth/google", (req, res) => {
//     res.send('<a href="/auth/github">Login with Github</a>');
//   });
  
  app.get(
    "/auth/github",
    passport.authenticate("github", { scope: ["user:email"] })
  );
  
//   app.get(
//     "/auth/github/callback",
//     passport.authenticate("github", { failureRedirect: "/login" }),
//     (req, res) => {
//       console.log("Utilisateur authentifié :", req.user); // Log l'utilisateur
//       res.redirect("http://localhost:3000/login?message=login_success"); // Redirection vers /login avec un message
// }    );


app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  (req, res) => {
      res.redirect("http://localhost:3000/Home"); // Redirection frontend React
  }
);




// Configuration de Passport Google OAuth
passport.use(
    new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: "http://localhost:5000/auth/google/callback", // ✅ Corrigé pour pointer vers le backend
        },
        (accessToken, refreshToken, profile, done) => {
            console.log("✅ Authentification réussie !");
            console.log("🔵 Token reçu :", accessToken);
            console.log("🟢 Profil reçu :", profile);
            return done(null, profile);
        }
    )
);

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});



// Routes d'authentification Google
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get('/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        // Rediriger vers le frontend avec le token
        const token = req.user.token;  // Assurez-vous d'avoir généré un JWT ici
        res.redirect(`http://localhost:3000/home?token=${token}`);
    }
);




app.get("/login-failed", (req, res) => {
    res.send("Échec de l'authentification. Vérifie les logs !");
});

// Déconnexion
app.get("/logout", (req, res) => {
    req.logout(() => {
        res.redirect("http://localhost:3000/login");
    });
});

// Gestion des erreurs
app.use(function(req, res, next) {
    next(createError(404));
});

app.use(function(err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

// ✅ Démarrage du serveur backend sur le bon port
const PORT = 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
