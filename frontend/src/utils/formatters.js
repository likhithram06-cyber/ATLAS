// What this file does: formatters — currency and date helpers shared across pages
// Formats a number as Indian Rupee notation (Cr / L)
export function formatPrice(price) {
  if (!price) return '—';
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(1)} Cr`;
  if (price >= 100000)   return `₹${(price / 100000).toFixed(0)} L`;
  return `₹${price.toLocaleString('en-IN')}`;
}

// Formats a date string as DD Mon YYYY
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
