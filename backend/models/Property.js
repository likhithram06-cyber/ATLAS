// What this file does: Mongoose schema for real estate property listings
const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, required: true },
  price:       { type: Number, required: true, index: true }, // indexed for binary search
  location:    { type: String, required: true, index: true },
  bhk:         { type: Number, required: true, index: true },
  images:      [{ type: String }],  // array of image paths
  features:    [{ type: String }],
  sqft:        { type: Number },
  facing:      { type: String },
  ageYears:    { type: Number, default: 0 },
  agent:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Property", propertySchema);
