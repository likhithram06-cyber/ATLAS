// What this file does: controller for admin-only aggregates, queries, and leads sorted by intent score
const Property = require('../models/Property');
const Enquiry = require('../models/Enquiry');
const MaxHeap = require('../utils/maxHeap');

// GET all properties along with their total enquiry counts
exports.getPropertiesEnquiriesSummary = async (req, res) => {
  try {
    const properties = await Property.find().lean();

    const results = await Promise.all(properties.map(async (p) => {
      const count = await Enquiry.countDocuments({ property: p._id });
      return { ...p, enquiryCount: count };
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET all enquiries for a single property, sorted by intentScore using a Max-Heap
exports.getPropertyEnquiries = async (req, res) => {
  try {
    const rawEnquiries = await Enquiry.find({ property: req.params.id })
      .populate('user', 'name phone email')
      .lean();

    // Insert all enquiries into our custom MaxHeap
    const heap = new MaxHeap();
    rawEnquiries.forEach(e => heap.insert(e));
    
    // Extract them in sorted order (Max first)
    const sorted = heap.toSortedArray();

    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET full detailed info of a single enquiry
exports.getEnquiryDetail = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('property', 'title location price images');
      
    if (!enquiry) {
      return res.status(404).json({ error: 'Enquiry not found' });
    }
    res.json(enquiry);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
