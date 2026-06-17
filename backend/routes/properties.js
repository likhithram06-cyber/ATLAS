// What this file does: property CRUD routes with binary search filtering and cosine similarity
const express    = require('express');
const Property   = require('../models/Property');
const { verifyAdmin } = require('../middleware/authMiddleware');
const { findPriceRange } = require('../utils/binarySearch');
const { getSimilar }     = require('../utils/cosineSimilarity');

const router = express.Router();

// GET /api/properties — returns all properties, optionally filtered by price range
router.get('/', async (req, res) => {
  try {
    // Fetch all sorted by price ascending (needed for binary search)
    let properties = await Property.find().sort({ price: 1 });

    const { minPrice, maxPrice, bhk, location } = req.query;

    // Apply binary search price filter if price params exist
    if (minPrice || maxPrice) {
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || Infinity;
      properties = findPriceRange(properties, min, max);
    }

    // Apply BHK and location filters (linear, small dataset is fine)
    if (bhk) properties = properties.filter(p => p.bhk === parseInt(bhk));
    if (location) {
      properties = properties.filter(p =>
        p.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/similar/:id — returns top 4 similar listings using cosine similarity
router.get('/similar/:id', async (req, res) => {
  try {
    const target = await Property.findById(req.params.id);
    if (!target) return res.status(404).json({ error: 'Property not found' });

    const all = await Property.find();
    const similar = getSimilar(target, all, 4);
    res.json(similar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id — returns a single property by ID
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/properties — creates a new listing (admin only)
router.post('/', verifyAdmin, async (req, res) => {
  try {
    const property = await Property.create(req.body);
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
