// What this file does: routing for property listing and details operations
const express = require('express');
const upload = require('../middleware/upload');
const propertyController = require('../controllers/propertyController');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/',                    propertyController.getProperties);
router.get('/similar/:id',         propertyController.getSimilarProperties);
router.get('/:id',                 propertyController.getPropertyById);
router.post('/', verifyAdmin, upload.array('images', 5), propertyController.createProperty);

module.exports = router;
