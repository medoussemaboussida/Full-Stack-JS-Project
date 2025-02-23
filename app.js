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

// Connexion à la base de données
const db = require('./config/dbconnection.json');
mongo.connect(db.url).then(() => {
    console.log('✅ Database connectée');
}).catch(() => console.log('❌ Erreur de connexion à la database'));

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// ✅ CORS - Unifier les origines
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

// ✅ Configuration de session pour Passport
app.use(session({ secret: "secret_key", resave: false, saveUninitialized: true }));
app.use(passport.initialize());
app.use(passport.session());

// Route pour reset-password avec rendu de la vue
app.get('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    res.render('reset-password', { token });
});

// Configuration de Passport Google OAuth
passport.use(
    new GoogleStrategy(
        {
            clientID: "388289107358-ud1mrbl4bp79ail2kafaftkd8v39632b.apps.googleusercontent.com",
            clientSecret: "OCSPX-_Z8VDIt6cmBNVyQnIdJqD0S_fcV4é",
            callbackURL: "http://localhost:5000/auth/google/callback", // ✅ Corrigé pour pointer vers le backend
        },
        (accessToken, refreshToken, profile, done) => {
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

// Routes API
app.use('/', indexRouter);
app.use('/users', usersRouter);

// ✅ Routes d'authentification Google
app.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
    "/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        res.redirect("http://localhost:3000/Home"); // Redirection frontend React
    }
);

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
