// What this file does: cosine similarity to find properties similar to a given one
// Used in "You Might Also Like" section on Property Detail page

// Encodes a city name to a numeric value for vector comparison
function encodeLocation(location) {
  const cities = {
    'hyderabad': 1, 'vijayawada': 2, 'bangalore': 3,
    'mumbai': 4, 'delhi': 5, 'chennai': 6,
  };
  return cities[location.toLowerCase()] || 0;
}

// Builds a 3-element vector [normalized_price, bhk, encoded_location]
function buildVector(property, maxPrice) {
  return [
    property.price / maxPrice,         // normalize price to 0-1
    property.bhk / 5,                  // normalize bhk (assume max 5)
    encodeLocation(property.location) / 6, // normalize location code
  ];
}

// Computes dot product of two equal-length arrays
function dotProduct(a, b) {
  return a.reduce((sum, val, i) => sum + val * b[i], 0);
}

// Computes the Euclidean magnitude of a vector
function magnitude(v) {
  return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
}

// Returns top N most similar properties to the target using cosine similarity
function getSimilar(targetProperty, allProperties, topN = 4) {
  const maxPrice = Math.max(...allProperties.map(p => p.price));
  const targetVec = buildVector(targetProperty, maxPrice);

  const scored = allProperties
    .filter(p => p._id.toString() !== targetProperty._id.toString())
    .map(p => {
      const vec = buildVector(p, maxPrice);
      const dot = dotProduct(targetVec, vec);
      const mag = magnitude(targetVec) * magnitude(vec);
      const similarity = mag === 0 ? 0 : dot / mag;
      return { property: p, similarity };
    });

  // Sort by similarity descending, return top N
  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topN).map(s => s.property);
}

module.exports = { getSimilar };
