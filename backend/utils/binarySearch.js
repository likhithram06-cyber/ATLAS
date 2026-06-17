// What this file does: binary search utility for filtering properties by price range
// Time complexity: O(log n) vs O(n) for a linear scan — much faster on large datasets

// Finds the leftmost index where price >= minPrice
function findLeftBoundary(sortedArr, minPrice) {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedArr[mid].price < minPrice) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Finds the rightmost index where price <= maxPrice
function findRightBoundary(sortedArr, maxPrice) {
  let lo = 0, hi = sortedArr.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedArr[mid].price <= maxPrice) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

// Returns all properties whose price falls within [minPrice, maxPrice]
function findPriceRange(sortedProperties, minPrice, maxPrice) {
  const left  = findLeftBoundary(sortedProperties, minPrice);
  const right = findRightBoundary(sortedProperties, maxPrice);
  if (left > right) return [];
  return sortedProperties.slice(left, right + 1);
}

module.exports = { findPriceRange };
