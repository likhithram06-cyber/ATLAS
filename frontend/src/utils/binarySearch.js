// What this file does: client-side binary search utility to find properties within a price range
export function binarySearchByPrice(sortedProperties, minPrice, maxPrice) {
  if (!sortedProperties || sortedProperties.length === 0) return [];

  // Helper to find the first index where property price >= target
  function findLowerBound(arr, target) {
    let low = 0;
    let high = arr.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (arr[mid].price >= target) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  // Helper to find the first index where property price > target
  function findUpperBound(arr, target) {
    let low = 0;
    let high = arr.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (arr[mid].price > target) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    return low;
  }

  const start = findLowerBound(sortedProperties, minPrice);
  const end = findUpperBound(sortedProperties, maxPrice);

  return sortedProperties.slice(start, end);
}
