// What this file does: Mongoose schema for platform users
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true },
  email:            { type: String, required: true, unique: true },
  phone:            { type: String, required: true, unique: true },
  googleId:         { type: String, unique: true, sparse: true },
  authProvider:     { type: String, enum: ['password', 'google'], default: 'password' },
  passwordHash:     { type: String, required: false },
  role:             { type: String, enum: ['client', 'admin'], default: 'client' },
  // Array of property IDs the user has saved/bookmarked
  savedProperties:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
  createdAt:        { type: Date, default: Date.now },
});

// Compares a plain-text password against the stored hash
userSchema.methods.comparePassword = async function (plainText) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plainText, this.passwordHash);
};

module.exports = mongoose.model('User', userSchema);
