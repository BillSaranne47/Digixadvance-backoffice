const apiRequest = require('../services/api');
const bcrypt = require('bcrypt');

const UserbaseUrl = process.env.UserbaseUrl;
const BankbaseUrl = process.env.BankbaseUrl;

exports.getlogin = async (req, res) => {
  res.render('pages/auth/login', {
    layout: false,
    title: 'Login Page',
  });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;


  // Validation basique côté serveur
  if (!email || !password) {
    return res.redirect('/?info=' + encodeURIComponent("Email et mot de passe requis"));
  }

  try {
    const userData = await apiRequest.post(`${UserbaseUrl}api/auth/login`, {
      email,
      password
    });


    // Step 2: If 2FA is enabled → redirect to verification page
    if (userData.twofa_enabled === true) {
      // Store temporary credentials for 2FA verification
      req.session.pendingLogin = {
        email,
        password,     // keep password only temporarily!
        userId: userData.id
      };
      console.log("⚠️ 2FA enabled → redirecting to verification");
      return res.redirect('/twofa/verify');
    }


    // Vérifie structure de la réponse
    if (!userData || !userData.id) {
      throw new Error('Réponse API invalide - Données manquantes');
    }

    // if (userData.twofa_enabled) {
    //     // Store pending login state (without logging in fully)
    //     return res.redirect('/twofa/verify');
    // }

    // Stockage dans la session
    req.session.user = {
      id: userData.id,
      username: userData.name,
      email: userData.email,
      bank_id: userData.bank_id,
      interfaceUser: userData.interface_user,
      roles: userData.roles,
      customRoles: userData.custom_roles,
      usermenu: userData.userMenu,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      msisdn: userData.msisdn
    };

    // Set HTTP-only cookies
    res.cookie('accessToken', userData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });

    res.cookie('refreshToken', userData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log('✅ Utilisateur connecté:', req.session.user);

    res.redirect('/dashboard');

  } catch (error) {
    console.error("❌ Erreur login:", error.message, error.stack);

    let errorMessage = 'Connection failed. Please try again later.';

    // Si l'API a bien répondu avec un message clair
    if (error.isNetworkError) {
      errorMessage = 'Unable to connect to the server. Please try again later.';
    }
    else if (error.status === 401) {
      errorMessage = error.data?.message || 'Email ou mot de passe invalide.';
    }
    else if (error.data?.message) {
      errorMessage = error.data.message;
    }

    return res.redirect('/?error=' + encodeURIComponent(errorMessage));
  }
};

exports.logout = (req, res) => {
  res.clearCookie('accessToken', { path: '/' });
  res.clearCookie('refreshToken', { path: '/' });
  res.clearCookie('connect.sid', { path: '/' });

  // Destroy session and ensure no residual data remains
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error:', err);
    }

    // Set headers to prevent caching
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Redirect with a timestamp to prevent caching of the redirect
    res.send(`
      <script>
        // Clear client-side storage
        localStorage.clear();
        sessionStorage.clear();
        
        // Prevent back navigation by replacing history state
        window.history.pushState(null, null, '/');
        window.addEventListener('popstate', () => {
          window.location.replace('/');
        });

        // Redirect to login page
        window.location.replace('/');
      </script>
    `);
  });
};

// Show 2FA setup page
exports.getTwoFactorSetup = async (req, res) => {
  console.log('enabling 2fa');
  if (!req.session.user) {
    return res.redirect('/?error=' + encodeURIComponent('Please log in first'));
  }

  try{
    const data  = await apiRequest.get(`${UserbaseUrl}api/auth/twofa/setup`,req);

      // Store the secret in the session
    req.session.temp_twofa_secret = data.secret;

    console.log('qrcodeurl',data.qrCodeUrl)
    console.log('secrete',data.secret)
    res.render('pages/user/twofa_setup', {
      qrCodeUrl: data.qrCodeUrl,
      secret: data.secret
    });
  }catch (err) {
    console.error('Error fetching 2FA setup:', err.message);
    return res.redirect('/profile?error=' + encodeURIComponent('Failed to start 2FA setup'));
  }
 
};

// Verify 2FA code during setup
exports.verifyTwoFactorSetup = async (req, res) => {
  console.log('verifying the code from frontend');
  const { token } = req.body;
  console.log('token entered by user:',token);

  try {

    // Send only the token to the backend; backend uses its stored temp secret
    const response = await apiRequest.post(
      `${UserbaseUrl}api/auth/twofa/activate`,
      { token }, // only send token
      req
    );

    console.log('Backend verification response:', response);
    
    // Clear temp secret after successful verification
    delete req.session.temp_twofa_secret;

    console.log('Two-factor authentication enabled')
    return res.redirect('/users/profile?success=' + encodeURIComponent('Two-factor authentication enabled'));
  } catch (err) {
    console.error('2FA setup verify error:', err.response?.data || err.message);
    return res.redirect('/twofa/setup?error=' + encodeURIComponent('Invalid code'));
  }

};

// Render 2FA verify page
exports.getTwoFactorVerify = async (req, res) => {
  res.render('pages/auth/twofa_verify', {
    layout: false,
    title: 'Two-Factor Verification',
    error: null
  });
};

// Verify 2FA after login
exports.postTwoFactorVerify = async (req, res) => {
  const { token } = req.body;

   if (!req.session.pendingLogin) {
    return res.redirect('/?error=' + encodeURIComponent("Session expirée, veuillez vous reconnecter."));
  }

  const { email, password } = req.session.pendingLogin;

  try {
    const userData = await apiRequest.post(`${UserbaseUrl}api/auth/login`, {
      email,
      password,
      token   // <-- include token here
    });

    console.log("✅ 2FA verified, logging in:", userData);

// clear pending login
    delete req.session.pendingLogin;

    // store full user in session
    req.session.user = {
      id: userData.id,
      username: userData.name,
      email: userData.email,
      bank_id: userData.bank_id,
      interfaceUser: userData.interface_user,
      roles: userData.roles,
      customRoles: userData.custom_roles,
      usermenu: userData.userMenu,
      accessToken: userData.accessToken,
      refreshToken: userData.refreshToken,
      msisdn: userData.msisdn
    };

    // set cookies
    res.cookie('accessToken', userData.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', userData.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    return res.redirect('/dashboard');
  } catch (error) {
    console.error('2FA Verification Error:', error);
    return res.render('pages/auth/twofa_verify', {
      layout: false,
      title: 'Two-Factor Verification',
      error: 'An error occurred during verification. Please try again.'
    });
  }
};

// Disable 2FA
exports.disableTwoFactor = async (req, res) => {
  try {
    await apiRequest.post(`${UserbaseUrl}api/auth/twofa/disable`, {}, req);

    req.session.user.twofa_enabled = false;
    return res.redirect('/users/profile?success=' + encodeURIComponent('Two-factor authentication has been disabled'));
  } catch (err) {
    console.error('Disable 2FA error:', err.response?.data || err.message);
    return res.redirect('/users/profile?error=' + encodeURIComponent('Failed to disable 2FA'));
  }
};

// Check 2FA status
exports.checkTwoFactorStatus = async (req, res) => {
  try {
    const data  = await apiRequest.get(`${UserbaseUrl}api/auth/twofa/status`,req);
    
    return res.json({ twofaEnabled: data.twofaEnabled });
  } catch (err) {
    console.error('Error checking 2FA status:', err.message);
    return res.status(500).json({ error: 'Failed to check 2FA status' });
  }
};