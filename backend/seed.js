// What this file does: Seeds all 535 realistic property listings into MongoDB
// using real images and textual metadata from the emanhamed/Houses-dataset repo.
// Run with: node seed.js  (from the backend/ directory)

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Property = require("./models/Property");

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected for seeding"))
  .catch(err => { console.error(err); process.exit(1); });

// Build image arrays from the real Houses-dataset
function houseImages(n) {
  const base = '/uploads/dataset';
  return [
    `${base}/${n}_frontal.jpg`,
    `${base}/${n}_bedroom.jpg`,
    `${base}/${n}_bathroom.jpg`,
    `${base}/${n}_kitchen.jpg`,
  ];
}

// Realistic premium Indian real estate locations
const LOCATIONS = [
  "Banjara Hills, Hyderabad",
  "Jubilee Hills, Hyderabad",
  "Gachibowli, Hyderabad",
  "Madhapur, Hyderabad",
  "Kondapur, Hyderabad",
  "Film Nagar, Hyderabad",
  "Hitec City, Hyderabad",
  "Vijayawada Central, AP",
  "MG Road, Vijayawada",
  "Amaravati, AP",
  "Whitefield, Bangalore",
  "Koramangala, Bangalore",
  "Indiranagar, Bangalore",
  "Bellandur, Bangalore",
  "Electronic City, Bangalore",
  "Defence Colony, Delhi",
  "Khar, Mumbai",
  "Navi Mumbai, Maharashtra",
  "Baner, Pune",
  "Sector 62, Noida"
];

const PREFIXES = ["Aurum", "Prestige", "Amber", "Ember", "Marble", "Bronze", "Copper", "Golden", "Silver", "Terra", "Sunrise", "Sunset", "Emerald", "Sapphire", "Ruby", "Diamond", "Opal", "Pearl", "Crystal", "Quartz", "Platinum", "Jade", "Orchid", "Ivy", "Cedar", "Pine", "Oak", "Maple", "Willow", "Royal", "Imperial", "Regent", "Grand", "Vista", "Crest", "Heights", "Valley", "Meadows", "Gardens", "Haven", "Sanctuary", "Retreat", "Manor", "Estate", "Residences", "Villas", "Courts", "Towers", "Enclave", "Palms"];
const SUFFIXES = ["Residences", "Villas", "Courts", "Towers", "Enclave", "Palms", "Heights", "Valley", "Meadows", "Gardens", "Haven", "Sanctuary", "Retreat", "Manor", "Estate", "Apartments", "Suites", "Castle", "Mansion", "Cottage", "Lodge", "Terraces", "Ridge", "Plaza", "Pavilion", "Cloisters", "Green", "View", "Point", "Square"];

const FEATURES_LIST = [
  "Modular Kitchen", "24/7 Security", "Power Backup", "Reserved Parking",
  "Rooftop Garden", "Club House", "Swimming Pool", "Gym",
  "Vastu Compliant", "Rain Water Harvesting", "Solar Panels", "EV Charging",
  "Gated Community", "Intercom", "CCTV", "Jogging Track"
];

const FACINGS = ["East", "West", "North", "South"];

async function seed() {
  try {
    await Property.deleteMany({});
    console.log("Cleared existing properties");

    const infoPath = path.join(__dirname, "../tmp/houses-dataset/Houses Dataset/HousesInfo.txt");
    if (!fs.existsSync(infoPath)) {
      throw new Error(`HousesInfo.txt not found at: ${infoPath}`);
    }

    const content = fs.readFileSync(infoPath, "utf-8");
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    console.log(`Found ${lines.length} entries in HousesInfo.txt`);

    const properties = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const houseNum = i + 1;

      // Format of line: Bedrooms Bathrooms Area Zipcode Price
      const parts = line.split(/\s+/);
      if (parts.length < 5) {
        console.warn(`Skipping malformed line ${houseNum}: ${line}`);
        continue;
      }

      const bedrooms = Math.round(parseFloat(parts[0])) || 1;
      const bathrooms = parseFloat(parts[1]) || 1;
      const sqft = parseInt(parts[2]) || 1000;
      const zipcode = parts[3];
      const usdPrice = parseFloat(parts[4]) || 500000;

      // Convert USD price to Rupees by multiplying by 80
      const price = Math.round(usdPrice * 80);

      // Deterministic layout values
      const title = `${PREFIXES[i % PREFIXES.length]} ${SUFFIXES[(i + 3) % SUFFIXES.length]}`;
      const location = LOCATIONS[i % LOCATIONS.length];
      const facing = FACINGS[i % FACINGS.length];
      const ageYears = i % 8;

      // Features list: select 3 to 6 deterministic features
      const featuresCount = 3 + (i % 4);
      const features = [];
      for (let f = 0; f < featuresCount; f++) {
        const feat = FEATURES_LIST[(i + f) % FEATURES_LIST.length];
        if (!features.includes(feat)) {
          features.push(feat);
        }
      }

      const description = `This beautiful ${bedrooms} BHK property located in the serene neighborhood of ${location} offers modern amenities, premium finishes, and a spacious layout of ${sqft} sqft. Features a well-ventilated structure facing ${facing} with a lovely design.`;

      properties.push({
        title,
        description,
        price,
        location,
        bhk: bedrooms,
        sqft,
        images: houseImages(houseNum),
        features,
        facing,
        ageYears,
      });
    }

    await Property.insertMany(properties);
    console.log(`\u2705 Seeded ${properties.length} properties from Houses-dataset successfully!`);

  } catch (err) {
    console.error("Seed failed:", err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
