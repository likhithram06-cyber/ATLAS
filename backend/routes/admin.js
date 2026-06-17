// What this file does: admin-only routes for viewing properties, enquiries, and call details
const express  = require('express');
const Property = require('../models/Property');
const Enquiry  = require('../models/Enquiry');
const MaxHeap  = require('../utils/maxHeap');
const { verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/admin/properties — all properties with their total enquiry counts
router.get('/properties', verifyAdmin, async (req, res) => {
  try {
    const properties = await Property.find().lean();

    // Attach enquiry count to each property
    const results = await Promise.all(properties.map(async (p) => {
      const count = await Enquiry.countDocuments({ property: p._id });
      return { ...p, enquiryCount: count };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/property/:id — enquiries for one property, sorted by intent score (max-heap)
router.get('/property/:id', verifyAdmin, async (req, res) => {
  try {
    const rawEnquiries = await Enquiry.find({ property: req.params.id })
      .populate('user', 'name phone email')
      .lean();

    // Insert all enquiries into a max-heap, then extract in sorted order
    const heap = new MaxHeap();
    rawEnquiries.forEach(e => heap.insert(e));
    const sorted = heap.toSortedArray();

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/enquiry/:id — full detail of a single enquiry with user and property info
router.get('/enquiry/:id', verifyAdmin, async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('property', 'title location price images');
    if (!enquiry) return res.status(404).json({ error: 'Enquiry not found' });
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
