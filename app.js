require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const http = require('http');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require("passport-github2").Strategy;
const createError = require('http-errors');
const userModel = require('./model/user');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');


const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
var forumRouter = require('./routes/forum');
var forumCommentRouter = require('./routes/forumComment');
var complaintRouter = require('./routes/complaint');
var complaintResponseRouter = require('./routes/complaintResponse');


const app = express();



const maxAge=1 * 60 * 60 ; //1hrs

const createtoken=(id,username)=>{
return jwt.sign({id,username},'tokenGoogle')
}

const createTokenGoogle = (id) => {
  return jwt.sign({ id }, "token", { expiresIn: maxAge });};



app.use('/uploads', express.static('uploads'));

// Connexion à la base de données
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connexion à MongoDB réussie'))
  .catch(err => {
    console.error('Erreur de connexion à MongoDB', err);
    process.exit(1); // Arrête l'application en cas d'erreur de connexion
  });

//  CORS - Unifier les origines
app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:5001"], // Autoriser frontend et back-office
    credentials: true,
}));
app.use('/uploads', express.static('uploads'));

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
app.use('/forum',forumRouter);
app.use('/forumComment',forumCommentRouter);
app.use('/complaint',complaintRouter);
app.use('/complaintResponse',complaintResponseRouter);

async function generateHashedPassword() {
  const randomPassword = crypto.randomBytes(16).toString('hex'); // 32 caractères aléatoires
  return await bcrypt.hash(randomPassword, 10); // Hachage du mot de passe
}




//GITHUB CONFIG 
// Configuration de Passport GitHub OAuth
const axios = require("axios");

passport.use(
  new GithubStrategy(
      {
          clientID: process.env.GIT_CLIENT_ID,
          clientSecret: process.env.GIT_CLIENT_SECRET,
          callbackURL: "http://localhost:5000/auth/github/callback",
          scope: ["user:email"]
      },
      async (accessToken, refreshToken, profile, done) => {
          try {
              let email = null;
              let dob = null;

              // 🔹 Étape 1 : Récupération de l'email
              if (profile.emails && profile.emails.length > 0) {
                  email = profile.emails[0].value;
              } else {
                  const emailResponse = await axios.get("https://api.github.com/user/emails", {
                      headers: { Authorization: `Bearer ${accessToken}` }
                  });
                  const primaryEmail = emailResponse.data.find(e => e.primary && e.verified);
                  if (primaryEmail) email = primaryEmail.email;
              }

              if (!email) {
                  console.error("❌ Aucune adresse email récupérée depuis GitHub.");
                  return done(new Error("No email found"), null);
              }

              // 🔹 Étape 2 : Récupération des informations utilisateur
              const userResponse = await axios.get("https://api.github.com/user", {
                  headers: { Authorization: `Bearer ${accessToken}` }
              });

              const { bio } = userResponse.data;

              // 🔹 Étape 3 : Extraire une date de naissance depuis la bio
              if (bio) {
                  const dateRegex = /(\d{2}\/\d{2}\/\d{4})|(\d{4}-\d{2}-\d{2})/;
                  const match = bio.match(dateRegex);
                  if (match) {
                      dob = new Date(match[0]);
                      console.log("📌 Date de naissance extraite :", dob);
                  }
              }

              // 🔹 Ajout de l'email et de la date de naissance au profil
              profile.email = email;
              dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18)) // ✅ Âge 19 ans

              return done(null, profile);
          } catch (error) {
              console.error("❌ Erreur lors de la récupération des informations GitHub:", error);
              return done(error, null);
          }
      }
  )
);



passport.serializeUser((user, done) => {
done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});


passport.deserializeUser((obj, done) => {
done(null, obj);
});

// Route pour l'authentification GitHub
app.get(
"/auth/github",
passport.authenticate("github", { scope: ["user:email"] })
);


app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  async (req, res) => {
    try {
      if (!req.user) {
        console.error("❌ Erreur: req.user est indéfini après l'authentification.");
        return res.redirect("http://localhost:3000/login?error=no_user");
      }

      const { id, displayName, emails, photos } = req.user;
      console.log("email:", emails);

      // Vérification si l'email existe
      if (!emails || emails.length === 0) {
        console.error("❌ Email introuvable après l'authentification Google.");
        return res.redirect("http://localhost:3000/login?error=no_email");
      }

      const existingUser = await userModel.findOne({ email: emails[0].value });

      if (existingUser) {
        // Si l'utilisateur existe déjà, on génère un token et on redirige
        const token = createTokenGoogle(existingUser.id);
        const verificationUrl = `http://localhost:3000/verify-account/${token}`;
        existingUser.validationToken = token;
        await existingUser.save();
        return res.redirect(verificationUrl);
      } else {
        // Si l'utilisateur n'existe pas, on en crée un nouveau
        const username = displayName || `user_${Date.now()}`; // Utilise un fallback au cas où displayName est vide
        const newUser = await userModel.create({
          username: username,
          password: "defaultPassword123", // Mot de passe par défaut
          email: emails[0].value,
          role: "student",
          speciality: "A",
          level: 1,
          dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18)), // Âge 18 ans par défaut
          isGoogleAuth: true, // Marquer comme authentifié par Google
        });

        const token = createTokenGoogle(newUser.id);
        const verificationUrl = `http://localhost:3000/verify-account/${token}`;
        newUser.validationToken = token;
        await newUser.save();
        return res.redirect(verificationUrl);
      }

    } catch (error) {
      console.error("❌ Authentication error:", error);
      return res.redirect("http://localhost:3000/login");
    }
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



// ✅ Routes d'authentification Google
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);




app.get(
"/auth/google/callback",
passport.authenticate("google", { failureRedirect: "/" }),
async (req, res) => {
  
     try{
      const { id, displayName, emails, photos} = req.user;
        console.log("email :",emails)
      const existingUser = await userModel.findOne({ email: emails[0].value });
      

      if (existingUser) {
         const token = createTokenGoogle(existingUser.id); 
         const verificationUrl = `http://localhost:3000/verify-account/${token}`; 
         existingUser.validationToken = token;
         await existingUser.save();
         res.redirect(verificationUrl);
      }
      else 
      {



        const newUser = await userModel.create({
          username: displayName,
          password: "defaultPassword123", // Set a default password here
          email: emails[0].value,

          role: "student",
          speciality:'A',
          level:1,
          dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18)),
          isGoogleAuth: true, // Mark as Google authenticated
          // ✅ Âge 19 ans
        });
         const token = createTokenGoogle(newUser.id); 
         const verificationUrl = `http://localhost:3000/verify-account/${token}`; 
         newUser.validationToken = token;
         await newUser.save();
         res.redirect(verificationUrl);
      }

     }catch (error) {
        console.error('Authentication error:', error);
        res.redirect("http://localhost:3000/login");
      }
}
);

// Déconnexion
app.post('/logout', (req, res) => {
  try {
      // Supprimer le cookie JWT
      res.clearCookie('jwt-token', { path: '/' });

      // Détruire la session
      req.session.destroy((err) => {
          if (err) {
              console.error("❌ Erreur lors de la destruction de la session :", err);
              return res.status(500).json({ message: "Failed to destroy session" });
          }

          // Répondre avec un message de succès
          res.status(200).json({ message: "Logged out successfully" });
      });
  } catch (error) {
      console.error("❌ Erreur lors de la déconnexion :", error);
      res.status(500).json({ message: error.message });
  }
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
