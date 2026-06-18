// Helper utility to resolve property image URLs pointing to backend or external sources
export function getImageUrl(path) {
  if (!path) return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendUrl}${cleanPath}`;
}
