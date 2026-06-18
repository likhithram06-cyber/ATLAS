// What this file does: controller for property actions — listing, details, recommendation matching, and creation
const Property = require('../models/Property');
const { findPriceRange } = require('../utils/binarySearch');
const { getSimilar } = require('../utils/cosineSimilarity');

// GET all properties (with price range, BHK, and location filtering)
exports.getProperties = async (req, res) => {
  try {
    let properties = await Property.find().sort({ price: 1 });
    const { minPrice, maxPrice, bhk, location } = req.query;

    if (minPrice || maxPrice) {
      const min = parseInt(minPrice) || 0;
      const max = parseInt(maxPrice) || Infinity;
      properties = findPriceRange(properties, min, max);
    }

    if (bhk) {
      properties = properties.filter(p => p.bhk === parseInt(bhk));
    }

    if (location) {
      properties = properties.filter(p =>
        p.location.toLowerCase().includes(location.toLowerCase())
      );
    }

    res.json(properties);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET top 4 similar listings based on cosine similarity
exports.getSimilarProperties = async (req, res) => {
  try {
    const target = await Property.findById(req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const all = await Property.find();
    const similar = getSimilar(target, all, 4);
    res.json(similar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET a single property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }
    res.json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST a new property (admin only)
exports.createProperty = async (req, res) => {
  try {
    // Extract image file paths from multer upload
    const imagePaths = (req.files || []).map(file => `/uploads/${file.filename}`);

    // Features may come as a comma-separated string from FormData
    let features = [];
    if (req.body.features) {
      if (Array.isArray(req.body.features)) {
        features = req.body.features;
      } else {
        features = req.body.features.split(',').map(f => f.trim()).filter(Boolean);
      }
    }

    // Merge image paths, parsed features, and numeric coercions
    const propertyData = {
      ...req.body,
      features,
      images: imagePaths,
      price:    Number(req.body.price)    || 0,
      bhk:      Number(req.body.bhk)      || 1,
      sqft:     Number(req.body.sqft)     || 0,
      ageYears: Number(req.body.ageYears) || 0,
    };

    const property = await Property.create(propertyData);
    res.status(201).json(property);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
