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

// ─── Centralized Public Image URLs (Unsplash CDN) ──────────────────────────
const EXTERIORS = [
  "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
  "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800",
  "https://images.unsplash.com/photo-1602941525421-8f8b81d3edbb?w=800",
  "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
  "https://images.unsplash.com/photo-1416331108676-a22ccb276e35?w=800",
  "https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?w=800",
  "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800"
];

const BEDROOMS = [
  "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800",
  "https://images.unsplash.com/photo-1617331140180-e8262094733a?w=800",
  "https://images.unsplash.com/photo-1560185127-6a2806647f81?w=800",
  "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800",
  "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800",
  "https://images.unsplash.com/photo-1540518614846-7eded433c457?w=800",
  "https://images.unsplash.com/photo-1505693395321-883724634266?w=800",
  "https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800",
  "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800",
  "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800",
  "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=800",
  "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800"
];

const BATHROOMS = [
  "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800",
  "https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800",
  "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800",
  "https://images.unsplash.com/photo-1620626011161-997c51447094?w=800",
  "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800",
  "https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800",
  "https://images.unsplash.com/photo-1570129476815-ba368ac77013?w=800",
  "https://images.unsplash.com/photo-1502005229762-fc1b2381f0db?w=800",
  "https://images.unsplash.com/photo-1600607688960-e095ff83135c?w=800",
  "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800",
  "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=800",
  "https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?w=800"
];

const KITCHENS = [
  "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800",
  "https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=800",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800",
  "https://images.unsplash.com/photo-1600489000022-c2086d79f9d4?w=800",
  "https://images.unsplash.com/photo-1556911220-1158b4415014?w=800",
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800",
  "https://images.unsplash.com/photo-1522050212171-61b01dd24579?w=800",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800",
  "https://images.unsplash.com/photo-1565183997392-2f6f122e5912?w=800"
];

const LIVING_ROOMS = [
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800",
  "https://images.unsplash.com/photo-1618219908412-a29a1bb7b86e?w=800",
  "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
  "https://images.unsplash.com/photo-1600210492493-0946911123ea?w=800",
  "https://images.unsplash.com/photo-1618220179428-22790b461013?w=800",
  "https://images.unsplash.com/photo-1617806118233-18e1db207f62?w=800",
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=800",
  "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=800",
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800",
  "https://images.unsplash.com/photo-1615529182904-14819c35db37?w=800",
  "https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?w=800",
  "https://images.unsplash.com/photo-1616046229478-9901c5536a45?w=800"
];

function buildHouseImageSets(housesCount = 12) {
  const houses = [];
  for (let i = 0; i < housesCount; i++) {
    houses.push([
      EXTERIORS[i % EXTERIORS.length],
      BEDROOMS[i % BEDROOMS.length],
      BATHROOMS[i % BATHROOMS.length],
      KITCHENS[i % KITCHENS.length],
      LIVING_ROOMS[i % LIVING_ROOMS.length]
    ]);
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
