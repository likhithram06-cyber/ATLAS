// What this file does: manually verifies Firebase ID tokens using Google's public keys.
// This allows authentication to work without requiring a serviceAccountKey.json file.
const jwt = require('jsonwebtoken');
const axios = require('axios');

let publicKeysCache = null;
let cacheExpiry = 0;

// Fetches Google's public certificates for Firebase Auth
async function getPublicKeys() {
  const now = Date.now();
  if (publicKeysCache && now < cacheExpiry) {
    return publicKeysCache;
  }

  const res = await axios.get('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  publicKeysCache = res.data;
  // Cache for 6 hours (Firebase keys rotate every few hours)
  cacheExpiry = now + 6 * 60 * 60 * 1000;
  return publicKeysCache;
}

// Verifies the Firebase ID token and returns the decoded payload
async function verifyFirebaseToken(idToken) {
  if (!idToken) {
    throw new Error('No Firebase ID token provided');
  }

  // Decode token to read the header kid
  const decodedToken = jwt.decode(idToken, { complete: true });
  if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
    throw new Error('Invalid Firebase ID token format');
  }

  const kid = decodedToken.header.kid;
  const publicKeys = await getPublicKeys();
  const cert = publicKeys[kid];

  if (!cert) {
    throw new Error('Firebase public key not found for kid');
  }

  const projectId = 'atlas-fa1ad';
  
  // Verify signature, audience, and issuer
  const verified = jwt.verify(idToken, cert, {
    algorithms: ['RS256'],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`
  });

  return verified;
}

module.exports = { verifyFirebaseToken };
