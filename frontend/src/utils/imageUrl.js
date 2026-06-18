const EXTERIORS = [
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
  'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
  'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800'
];

const BEDROOMS = [
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800',
  'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800',
  'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800',
  'https://images.unsplash.com/photo-1560185007-c5ca9d2c014d?w=800'
];

const BATHROOMS = [
  'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800',
  'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800',
  'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=800'
];

const KITCHENS = [
  'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?w=800',
  'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800',
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800'
];

export function getImageUrl(path) {
  if (!path) return 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=700';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // If we are in production (pointed to cloud API), redirect local dataset paths to premium placeholder images
  const isProduction = backendUrl.includes('render.com') || backendUrl.includes('railway.app') || !backendUrl.includes('localhost');
  if (isProduction && path.includes('uploads/dataset/')) {
    const filename = path.split('/').pop() || '';
    const numMatch = filename.match(/^(\d+)/);
    const n = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (filename.includes('bedroom')) {
      return BEDROOMS[n % BEDROOMS.length];
    } else if (filename.includes('bathroom')) {
      return BATHROOMS[n % BATHROOMS.length];
    } else if (filename.includes('kitchen')) {
      return KITCHENS[n % KITCHENS.length];
    } else {
      return EXTERIORS[n % EXTERIORS.length];
    }
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${backendUrl}${cleanPath}`;
}

