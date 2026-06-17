// What this file does: authentication routes — register, login, admin-login, me, and google-auth using Firebase
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const User     = require('../models/User');
const { verifyToken } = require('../middleware/authMiddleware');
const { verifyFirebaseToken } = require('../utils/firebaseVerifier');

const router = express.Router();

// Signs a JWT for a regular user
function signUserToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register — creates a new user account (verifies phone ID token from Firebase)
router.post('/register', async (req, res) => {
  try {
    const { name, phone, email, password, firebaseIdToken } = req.body;
    if (!name || !phone || !email || !password || !firebaseIdToken) {
      return res.status(400).json({ error: 'All fields including verification token are required' });
    }

    // Verify the Firebase Phone token
    let decoded;
    try {
      decoded = await verifyFirebaseToken(firebaseIdToken);
    } catch (verifErr) {
      return res.status(401).json({ error: `Verification failed: ${verifErr.message}` });
    }

    // Ensure token is indeed a phone sign-in token
    if (!decoded.phone_number) {
      return res.status(400).json({ error: 'Provided token is not a valid phone verification token' });
    }

    // Check if user already exists
    const exists = await User.findOne({ $or: [{ email }, { phone }, { firebaseUid: decoded.uid }] });
    if (exists) {
      return res.status(409).json({ error: 'Email, phone, or Firebase UID already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      phone: decoded.phone_number, // use verified phone number directly
      email,
      passwordHash,
      firebaseUid: decoded.uid,
      authProvider: 'password',
      phoneVerified: true,
      role: 'client'
    });

    const token = signUserToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login — authenticates existing user (standard password check)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });

    const token = signUserToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/google — handles Google Auth token and optional phone token verification
router.post('/google', async (req, res) => {
  try {
    const { idToken, phoneToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify Google ID Token
    let verifiedGoogle;
    try {
      verifiedGoogle = await verifyFirebaseToken(idToken);
    } catch (err) {
      return res.status(401).json({ error: `Google verification failed: ${err.message}` });
    }

    const email = verifiedGoogle.email;
    const name = verifiedGoogle.name || email.split('@')[0];
    const firebaseUid = verifiedGoogle.uid;

    // Check if user already exists
    let user = await User.findOne({ $or: [{ firebaseUid }, { email }] });

    if (user) {
      // If user exists, but doesn't have firebaseUid set or is password provider, link them
      let updated = false;
      if (!user.firebaseUid) {
        user.firebaseUid = firebaseUid;
        updated = true;
      }
      if (user.authProvider !== 'google' && !user.passwordHash) {
        user.authProvider = 'google';
        updated = true;
      }
      if (updated) {
        await user.save();
      }
      const token = signUserToken(user);
      return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
    }

    // User does not exist, check if we have phone verification token
    if (!phoneToken) {
      return res.status(200).json({ needsPhone: true, email, name });
    }

    // Verify Phone Token
    let verifiedPhone;
    try {
      verifiedPhone = await verifyFirebaseToken(phoneToken);
    } catch (err) {
      return res.status(401).json({ error: `Phone verification failed: ${err.message}` });
    }

    if (!verifiedPhone.phone_number) {
      return res.status(400).json({ error: 'Invalid phone token: no phone number found' });
    }

    // Check if phone number is already taken by another account
    const phoneExists = await User.findOne({ phone: verifiedPhone.phone_number });
    if (phoneExists) {
      return res.status(409).json({ error: 'This phone number is already linked to another account' });
    }

    // Create new Google Auth user
    user = await User.create({
      name,
      email,
      phone: verifiedPhone.phone_number,
      firebaseUid,
      authProvider: 'google',
      phoneVerified: true,
      role: 'client'
    });

    const token = signUserToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/admin-login — checks hardcoded admin credentials from .env
router.post('/admin-login', (req, res) => {
  const { adminId, password } = req.body;
  if (adminId !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin credentials' });
  }

  const token = jwt.sign(
    { id: 'admin', role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
  res.json({ token });
});

// GET /api/auth/me — returns current user profile from JWT
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

