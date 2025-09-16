const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const session = require('express-session');
const db = require('./config/database');

const dashboardRouter = require('./routes/dashboardRoutes');
const usersRouter = require('./routes/usersRoutes');
const bankRoutes = require('./routes/bankRoutes');
const clientRoutes = require('./routes/clientRoutes');
const authRoutes = require('./routes/authRoutes');
const fundRoutes = require('./routes/fundRoutes');
const overdraftRoutes = require('./routes/overdraftRoutes');
const i18n = require('i18n');
const cookieParser = require('cookie-parser');

const ejsLayouts = require('express-ejs-layouts');
const flash = require('connect-flash');
const toastr = require('express-toastr');
const path = require('path');
const dotenv = require('dotenv');
const app = express();
const PORT = process.env.PORT || 3000;

const loadMenu = require('./middleware/loadMenu');
const apiRequest = require('./services/api'); 
const BankbaseUrl = process.env.BankbaseUrl;

dotenv.config();


i18n.configure({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  directory: path.join(__dirname, 'locales'), // Points directly to locales folder
  extension: '.json', // Looks for en.json, fr.json
  objectNotation: true,
  cookie: 'lang',
  register: global,
  updateFiles: false,
  syncFiles: false
});

app.use(cookieParser());
// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 15 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
}));
app.use(i18n.init);
app.use(flash());
app.use(toastr());
app.use((req, res, next) => {
  // Skip storing URL for these paths
  const excludedPaths = [
    '/change-language/en',
    '/change-language/fr',
    '/auth',
    '/favicon.ico'
  ];
  
  if (!req.session.originalUrl && !excludedPaths.some(path => req.originalUrl.includes(path))) {
    req.session.originalUrl = req.originalUrl;
  }
  next();
});


app.use(async (req, res, next) => {
  res.locals.__ = res.__;
  res.locals.locale = req.getLocale();
  res.locals.user = req.session.user || {};
  res.locals.usermenu = req.session.user?.usermenu || [];

  // Fetch bank name if user has a bank_id
  if (req.session.user && req.session.user.bank_id) {
    try {
      const bankInfo = await apiRequest.get(`${BankbaseUrl}api/banks/getBankById/${req.session.user.bank_id}`, req);
      res.locals.bankName = bankInfo.short_name || 'Unknown Bank';
    } catch (error) {
      console.error('Error fetching bank name:', error);
      res.locals.bankName = 'Unknown Bank'; // Fallback in case of error
    }
  } else {
    res.locals.bankName = null; // No bank name for users without bank_id
  }

  res.locals.toasts = req.toastr.render()
  next();
});
app.get('/change-language/:lang', (req, res) => {
  const lang = req.params.lang;
  
  if (['en', 'fr'].includes(lang)) {
    // Set language cookie without affecting session
    res.cookie('lang', lang, { 
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      sameSite: 'lax'
    });
    req.setLocale(lang);
  }

  // Redirect to referrer or home, avoiding loops
  const referrer = req.get('Referrer') || '/';
  const safeReferrer = referrer.includes('/change-language/') ? '/' : referrer;
  res.redirect(safeReferrer);
})
// app.use((req, res, next) => {

//   if (req.session.user) {
//     res.locals.user = req.session.user;
//     res.locals.usermenu = req.session.user.usermenu || [];
//   } else {
//     res.locals.user = null;
//     res.locals.usermenu = [];
//   }
//   next();
// });

//  View engine setup
app.use(ejsLayouts);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//  Static files
app.use(express.static(path.join(__dirname, 'public')));
// Use menu loader before routes
// app.use(loadMenu);



// route
app.use('/', authRoutes);
app.use('/dashboard', dashboardRouter);
app.use('/users', usersRouter);
app.use('/banks', bankRoutes);
app.use('/clients', clientRoutes);
app.use('/funds', fundRoutes);
app.use('/overdraft', overdraftRoutes);
// app.use('/2fa', twofaRouter);

//  Error handlers
app.use((req, res) => {
  res.status(404).render('pages/errors/404', { title: 'Page not found' });
});

app.use((err, req, res, next) => {
  res.status(500).render('pages/errors/500', { 
    title: 'process stop',
    
  });
});


// Connect to the database and start the server
(async () => {
  try {
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ MySQL connection failed:', err);
  }
})();