export function getImageUrl(path) {
  if (!path) return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // If we are in production (pointed to cloud API), redirect local dataset paths to the raw GitHub source images
  const isProduction = backendUrl.includes('render.com') || backendUrl.includes('railway.app') || !backendUrl.includes('localhost');
  if (isProduction && path.includes('uploads/dataset/')) {
    const filename = path.split('/').pop() || '';
    if (filename) {
      return `https://raw.githubusercontent.com/emanhamed/Houses-dataset/master/Houses%20Dataset/${filename}`;
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendUrl}${cleanPath}`;
}
