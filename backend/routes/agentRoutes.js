// What this file does: routing for AI voice agent recording upload, text transcription, and scoring
const express = require('express');
const multer = require('multer');
const agentController = require('../controllers/agentController');
const { optionalVerifyToken } = require('../middleware/authMiddleware');

const router = express.Router();
// Multer configuration: save uploads temporarily in a 'temp_uploads' folder inside backend
const upload = multer({ dest: 'temp_uploads/' });

router.post('/respond', upload.single('file'), agentController.respond);
router.post('/finalize', optionalVerifyToken, agentController.finalize);

module.exports = router;
