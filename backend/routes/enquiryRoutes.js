// What this file does: routing for user lead and enquiry submissions
const express = require('express');
const enquiryController = require('../controllers/enquiryController');
const { verifyToken } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', verifyToken,    enquiryController.createEnquiry);
router.get('/my', verifyToken,   enquiryController.getMyEnquiries);

module.exports = router;
