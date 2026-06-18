// What this file does: controller for registration, login, 2Factor OTP sending/verification, and Google OAuth
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyFirebaseToken } = require('../utils/firebaseVerifier');

// Helper to sign a JWT for a regular user
function signUserToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register a new user without Phone OTP
exports.register = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;
    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: 'Name, email, phone, and password are required' });
    }

    // Check if user already exists
    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) {
      return res.status(409).json({ error: 'Email or phone number already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name,
      email,
      phone,
      authProvider: 'password',
      passwordHash,
      role: 'client'
    });

    const token = signUserToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Standard Password Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = signUserToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Google Auth token verification using Firebase
exports.googleAuth = async (req, res) => {
  try {
    const { idToken, phone } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }

    // Verify Firebase ID Token
    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch (verifErr) {
      return res.status(401).json({ error: `Google verification failed: ${verifErr.message}` });
    }

    const googleId = decoded.uid || decoded.sub;
    if (!googleId) {
      return res.status(400).json({ error: 'Invalid Google token: user ID (uid/sub) not found' });
    }
    const email = decoded.email;
    const name = decoded.name || email.split('@')[0];

    // Check if user already exists
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      // Link Google ID if email matches but Google ID wasn't linked
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
        updated = true;
      }
      // If user exists but is missing a phone, and one was passed in:
      if (!user.phone && phone) {
        // Ensure this phone is unique
        const phoneExists = await User.findOne({ phone });
        if (phoneExists) {
          return res.status(409).json({ error: 'Phone number already registered' });
        }
        user.phone = phone;
        updated = true;
      }
      if (updated) {
        await user.save();
      }

      // If user exists but is missing phone number and none was provided:
      if (!user.phone) {
        return res.status(200).json({ needsPhone: true, email, name });
      }

      const token = signUserToken(user);
      return res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
    }

    // User does not exist - check if phone was submitted
    if (!phone) {
      return res.status(200).json({ needsPhone: true, email, name });
    }

    // Check if phone number is already registered
    const phoneExists = await User.findOne({ phone });
    if (phoneExists) {
      return res.status(409).json({ error: 'Phone number already registered' });
    }

    // Create the new Google user linked with the provided phone number
    user = await User.create({
      name,
      email,
      phone,
      googleId,
      authProvider: 'google',
      role: 'client'
    });

    const token = signUserToken(user);
    res.status(201).json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Profile detail of logged-in user
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle saving/bookmarking a property
exports.toggleSaveProperty = async (req, res) => {
  try {
    const propertyId = req.params.id;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const index = user.savedProperties.indexOf(propertyId);
    if (index > -1) {
      user.savedProperties.splice(index, 1); // remove
    } else {
      user.savedProperties.push(propertyId); // add
    }

    await user.save();
    res.json({ savedProperties: user.savedProperties });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Admin login flow verifying environment variables or the predefined passcode
exports.adminLogin = async (req, res) => {
  try {
    const { adminId, password } = req.body;
    if (!adminId || !password) {
      return res.status(400).json({ error: 'Admin ID and password are required' });
    }

    const expectedAdminId = process.env.ADMIN_ID || 'atlas_admin';
    const expectedPassword = process.env.ADMIN_PASSWORD || 'hackathon2024';
    const expectedAdminCode = process.env.ADMIN_CODE || '72426124';

    // Verify credentials: standard ID + password or standard ID + passcode
    if (adminId === expectedAdminId && (password === expectedPassword || password === expectedAdminCode)) {
      const token = jwt.sign(
        { id: 'admin_id', email: 'admin@atlas.com', role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );
      return res.json({ token, user: { id: 'admin_id', name: 'Admin', email: 'admin@atlas.com', role: 'admin' } });
    }

    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

