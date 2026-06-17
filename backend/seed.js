// What this file does: Creates 12 realistic property listings in MongoDB
// by grouping real images from the Kaggle dataset into houses.
// Each house gets: 1 exterior, 1 bedroom, 1 bathroom, 1 kitchen, 1 living room image.
// Run with: node seed.js

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Property = require("./models/Property");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected for seeding"))
  .catch(err => { console.error(err); process.exit(1); });

// ─── Helper: get N filenames from a folder ─────────────────────────────────
// What this does: reads a folder and returns up to N image filenames as web paths
function getImages(folderName, count, publicBasePath = "/images") {
  const folderPath = path.join(__dirname, "../frontend/public/images", folderName);
  
  // If folder doesn't exist, return placeholder
  if (!fs.existsSync(folderPath)) {
    return Array(count).fill(`${publicBasePath}/placeholder.jpg`);
  }

  const files = fs.readdirSync(folderPath)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, count);

  return files.map(f => `${publicBasePath}/${folderName}/${f}`);
}

// ─── Build 12 houses by combining images from different folders ─────────────
// What this does: takes one image from each room type and bundles them as one property
function buildHouseImageSets(housesCount = 12) {
  const exterior    = getImages("exterior",    housesCount);
  const bedroom     = getImages("bedroom",     housesCount);
  const bathroom    = getImages("bathroom",    housesCount);
  const kitchen     = getImages("kitchen",     housesCount);
  const living_room = getImages("living_room", housesCount);

  const houses = [];
  for (let i = 0; i < housesCount; i++) {
    // Each house: exterior first (shown on card), then room photos
    const imgs = [
      exterior[i]    || exterior[0],
      bedroom[i]     || bedroom[0],
      bathroom[i]    || bathroom[0],
      kitchen[i]     || kitchen[0],
      living_room[i] || living_room[0],
    ].filter(Boolean);
    houses.push(imgs);
  }
  return houses;
}

// ─── Property data ──────────────────────────────────────────────────────────
const locations = [
  "Banjara Hills, Hyderabad",
  "Jubilee Hills, Hyderabad",
  "Gachibowli, Hyderabad",
  "Vijayawada Central, AP",
  "Whitefield, Bangalore",
  "Koramangala, Bangalore",
  "Madhapur, Hyderabad",
  "MG Road, Vijayawada",
  "Kondapur, Hyderabad",
  "Film Nagar, Hyderabad",
  "Indiranagar, Bangalore",
  "Amaravati, AP",
];

const propertyNames = [
  "Aurum Residences",
  "The Ember Court",
  "Kiran Villas",
  "Golden Gate Apartments",
  "Sandstone Heights",
  "Amber Valley Estate",
  "The Bronze Palms",
  "Sundara Towers",
  "Dusk Villa",
  "Terra Nova Homes",
  "Copper Ridge",
  "The Harvest House",
];

const bhkOptions   = [1, 2, 2, 3, 3, 3, 4, 2, 3, 4, 2, 3];
// Prices in lakhs (Indian real estate)
const prices = [
  4500000,   // 45L
  7500000,   // 75L
  9800000,   // 98L
  12500000,  // 1.25Cr
  8200000,   // 82L
  15000000,  // 1.5Cr
  25000000,  // 2.5Cr
  6800000,   // 68L
  11000000,  // 1.1Cr
  32000000,  // 3.2Cr
  5500000,   // 55L
  18000000,  // 1.8Cr
];

const descriptions = [
  "A sun-drenched residence with warm stone interiors and panoramic city views. Built for those who value both comfort and character.",
  "Nestled in a quiet lane, this home features exposed brick, timber ceilings, and a kitchen that catches the evening light perfectly.",
  "Contemporary living meets traditional warmth. Wide corridors, tall windows, and a rooftop terrace overlooking the old city.",
  "A golden-hour home with terracotta floors, arched doorways, and a courtyard garden. Every room tells a story.",
  "Spacious and serene. Floor-to-ceiling windows, double-height ceilings, and finishes that age like fine wood.",
  "Urban sanctuary with sand-toned walls, built-in bookshelves, and a balcony garden facing the western hills.",
  "A landmark villa with amber-lit interiors, a private pool, and landscaped gardens. One of a kind.",
  "Cozy and well-connected. Modern kitchen, warm bedroom, ideal for first-time buyers or investors.",
  "Three generous bedrooms, each with its own character. A home that grows with your family.",
  "Premium penthouse with bronze fixtures, panoramic views on all four sides, and a private sky-lounge.",
  "Warm and welcoming starter home. Two bedrooms, bright kitchen, easy metro access.",
  "Architecturally distinct home in the new capital zone. Strong appreciation potential, excellent build quality.",
];

const featuresList = [
  ["Modular Kitchen", "24/7 Security", "Power Backup", "Reserved Parking"],
  ["Rooftop Garden", "Club House", "Swimming Pool", "Gym"],
  ["Vastu Compliant", "Rain Water Harvesting", "Solar Panels", "EV Charging"],
  ["Gated Community", "Intercom", "CCTV", "Jogging Track"],
  ["Furnished", "Lift", "Fire Safety", "Visitor Parking"],
  ["Sea Facing", "Terrace", "Servants Quarter", "Study Room"],
];

// ─── Main seed function ─────────────────────────────────────────────────────
async function seed() {
  try {
    // Clear existing properties
    await Property.deleteMany({});
    console.log("Cleared existing properties");

    const imagesSets = buildHouseImageSets(12);

    const properties = propertyNames.map((name, i) => ({
      title:       name,
      description: descriptions[i],
      price:       prices[i],
      location:    locations[i],
      bhk:         bhkOptions[i],
      images:      imagesSets[i],
      features:    featuresList[i % featuresList.length],
      sqft:        Math.floor(800 + (i * 120) + Math.random() * 200),
      facing:      ["East", "West", "North", "South"][i % 4],
      ageYears:    Math.floor(Math.random() * 8),
    }));

    await Property.insertMany(properties);
    console.log(`✅ Seeded ${properties.length} properties successfully`);
    console.log("Properties seeded:");
    properties.forEach((p, i) => {
      console.log(`  ${i+1}. ${p.title} — ${p.location} — ₹${(p.price/100000).toFixed(0)}L`);
    });

  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
