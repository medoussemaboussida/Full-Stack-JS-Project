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
const Schedule = require('./model/Schedule'); // Add this line
const Activity = require('./model/activity'); // Add this line
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const association = require("./model/association");
const event =require("./model/event");
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
var forumRouter = require('./routes/forum');
var forumCommentRouter = require('./routes/forumComment');
var complaintRouter = require('./routes/complaint');
var complaintResponseRouter = require('./routes/complaintResponse');
const associationRoutes = require('./routes/association');
const eventRoutes = require('./routes/event');
const mentalHealthRoutes = require('./routes/mentalHealth');
const Appointment = require("./model/appointment");
const Notification = require('./model/Notification'); // Adjust path to your Notification model
const nodemailer = require('nodemailer'); // Add this line
const cron = require('node-cron'); // Add this line
const app = express();



const maxAge=1 * 60 * 60 ; //1hrs

const createtoken = (id, username) => {
  return jwt.sign({ id, username }, 'randa', { expiresIn: maxAge });
};

const createTokenGoogle = (id) => {
  return jwt.sign({ id }, "token", { expiresIn: maxAge });};



  app.use('/uploads', express.static('uploads', {
    setHeaders: (res, path) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));
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
app.use('/association', associationRoutes);
app.use('/events', eventRoutes);
app.use('/mental-health', mentalHealthRoutes);

//mailing
// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Function to send reminder email
const sendReminderEmail = async (userEmail, activities, note, date) => {
  const mailOptions = {
    from: `"EspritCare" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `Your Activity and Notes Reminder for ${date}`,
    html: `
      <div style="
        background-image: url('http://localhost:5000/uploads/mailActivity.jpg');
        background-size: cover;
        background-position: center;
        padding: 50px 0;
      ">
        <div style="
          max-width: 600px;
          margin: 0 auto;
          background-color: rgba(255, 255, 255, 0.94);
          padding: 30px;
          border-radius: 12px;
          font-family: Arial, sans-serif;
          box-shadow: 0 0 10px rgba(0,0,0,0.15);
        ">
          <h2 style="color:#007bff; text-align:center;">Your Schedule for ${date}</h2>

          <h3 style="font-size:18px;color:#333;margin-top:20px;">Scheduled Activities:</h3>
          ${activities.length > 0 ? `
            <ul style="font-size:15px;color:#333;line-height:1.6;">
              ${activities.map((activity) => `<li>${activity.title} ${activity.completed ? '(✅ Completed)' : ''}</li>`).join('')}
            </ul>
          ` : '<p style="font-size:15px;color:#333;">No activities scheduled for today.</p>'}

          <h3 style="font-size:18px;color:#333;margin-top:20px;">Your Note:</h3>
          ${note ? `
            <p style="font-size:15px;color:#333;line-height:1.6;">${note}</p>
          ` : '<p style="font-size:15px;color:#333;">No note for today.</p>'}

          <p style="font-size:16px;color:#333;margin-top:20px;">Have a great day!</p>

          <hr style="margin:30px 0;">
          <p style="font-size:14px;text-align:center;">
            Cordialement,<br>
            <strong>EspritCare Team</strong><br>
            <a href="http://espritCare.com" style="color:#007bff;text-decoration:none;">www.espritCare.com</a>
          </p>
          <div style="text-align:center; margin-top:10px;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/ff/Logo_ESPRIT_Ariana.jpg" alt="EspritCare Logo" width="120">
          </div>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${userEmail}`);
  } catch (error) {
    console.error(`Error sending email to ${userEmail}:`, error);
  }
};

// Function to fetch schedules and send daily reminders
const sendDailyReminders = async () => {
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
  try {
    const users = await userModel.find(); // Fetch all users

    for (const user of users) {
      // Fetch schedule
      const schedule = await Schedule.findOne({ userId: user._id, date: today });
      const activityDetails = [];

      if (schedule && schedule.activities.length > 0) {
        activityDetails.push(...await Promise.all(
          schedule.activities.map(async (sched) => {
            const activity = await Activity.findById(sched.activityId);
            return {
              title: activity ? activity.title : 'Unknown Activity',
              completed: sched.completed,
            };
          })
        ));
      }

      // Get note from schedule
      const note = schedule ? schedule.note : '';

      if (activityDetails.length > 0 || note) {
        await sendReminderEmail(user.email, activityDetails, note, today);
      }
    }
    console.log('Daily reminders sent successfully');
  } catch (error) {
    console.error('Error in sendDailyReminders:', error);
  }
};

// Schedule the reminder task to run every day at 3:20 AM
cron.schedule('0 11 * * *', () => {
  console.log('Running daily reminder task at 11:30 AM...');
  sendDailyReminders();
});


async function generateHashedPassword() {
  const randomPassword = crypto.randomBytes(16).toString('hex'); // 32 caractères aléatoires
  return await bcrypt.hash(randomPassword, 10); // Hachage du mot de passe
}



//GITHUB CONFIG
// Configuration de Passport GitHub OAuth
const axios = require("axios");
const Association = require('./model/association');

// Only configure GitHub strategy if credentials are available
if (process.env.GIT_CLIENT_ID && process.env.GIT_CLIENT_SECRET) {
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
}



passport.serializeUser((user, done) => {
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
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/" }),
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
          speciality: "BI",
          level: 1,
          dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18)), // Âge 18 ans par défaut
          isGitAuth: true, // Marquer comme authentifié par Google
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
          speciality:"BI",
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

app.get('/generate-jitsi-room', (req, res) => {
  const roomCode = req.query.roomCode;
  const jitsiRoom = `MoodwaveChat_${roomCode}`;
  const roomPassword = crypto.randomBytes(8).toString('hex'); // Generate a random password
  res.json({ jitsiRoom, roomPassword });
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


// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { message: 'Something went wrong!', error: err.stack });
});


// Schedule reminders when the server starts
cron.schedule('* * * * *', async () => { // Runs every minute
  try {
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
    const appointments = await Appointment.find({
      status: 'confirmed',
      date: { $lte: fiveMinutesFromNow },
      startTime: fiveMinutesFromNow.toTimeString().slice(0, 5),
    }).populate('student psychiatrist');

    appointments.forEach(async (appointment) => {
      const message = `Reminder: Your appointment with ${appointment.psychiatrist.username} starts in 5 minutes!`;
      await Notification.create({
        userId: appointment.student._id,
        message,
        type: 'reminder',
        appointmentId: appointment._id,
      });
      console.log(`Reminder created for ${appointment.student.username}: ${message}`);
    });
  } catch (error) {
    console.error('Error in cron job:', error);
  }
});



// ✅ Démarrage du serveur backend sur le bon port
const PORT = 5000;
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
