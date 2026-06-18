// What this file does: routing for admin dashboard listings and enquiry scoring details
const express = require('express');
const adminController = require('../controllers/adminController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/properties', verifyAdmin,    adminController.getPropertiesEnquiriesSummary);
router.get('/enquiries', verifyAdmin,     adminController.getAllEnquiries);
router.get('/property/:id', verifyAdmin,   adminController.getPropertyEnquiries);
router.get('/enquiry/:id', verifyAdmin,    adminController.getEnquiryDetail);
router.get('/calls', verifyAdmin,          adminController.getCallRecords);
router.get('/calls/:callSid', verifyAdmin, adminController.getCallRecordDetail);

module.exports = router;
