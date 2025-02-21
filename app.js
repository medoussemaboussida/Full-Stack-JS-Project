require('dotenv').config();
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const http=require('http')
const mongo=require('mongoose')
const cors = require('cors');

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

app.use('/', indexRouter);
app.use('/users', usersRouter);

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
  