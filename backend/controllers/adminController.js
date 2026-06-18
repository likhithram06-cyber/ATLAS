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

// GET all enquiries across the entire platform
exports.getAllEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find()
      .populate('user', 'name phone email')
      .populate('property', 'title location price images')
      .sort({ intentScore: -1 })
      .lean();
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const CallRecord = require('../models/CallRecord');

// GET all call records (paginated, sorted newest first)
exports.getCallRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await CallRecord.countDocuments();
    const calls = await CallRecord.find()
      .populate('propertyId', 'title location price')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.json({
      calls,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalCalls: total,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET single call record detail by callSid
exports.getCallRecordDetail = async (req, res) => {
  try {
    const call = await CallRecord.findOne({ callSid: req.params.callSid })
      .populate('propertyId', 'title location price bhk sqft images')
      .lean();

    if (!call) {
      return res.status(404).json({ error: 'Call record not found' });
    }
    res.json(call);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
