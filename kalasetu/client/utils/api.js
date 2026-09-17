import axios from 'axios';
import { Platform } from 'react-native';

// Update this to your machine's LAN IP when testing on a physical device,
// e.g. 'http://192.168.1.42:5000'. Android emulator uses 10.0.2.2 to reach
// the host machine's localhost.
const DEV_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_BASE_URL = `http://${DEV_HOST}:5000`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ---------- Artisan endpoints ----------
export async function registerArtisan(payload) {
  const { data } = await api.post('/api/artisans/register', payload);
  return data;
}

export async function getArtisanDashboard(artisanId) {
  const { data } = await api.get(`/api/artisans/${artisanId}/dashboard`);
  return data;
}

export async function updateArtisanProfile(artisanId, payload) {
  const { data } = await api.put(`/api/artisans/${artisanId}`, payload);
  return data;
}

// ---------- Product endpoints ----------
export async function checkPrice(payload) {
  const { data } = await api.post('/api/products/price-check', payload);
  return data;
}

export async function createProduct({ artisanId, title, description, category, rawCost, laborHours, weightOrSize, skillLevel, imageAsset }) {
  const form = new FormData();
  form.append('artisanId', artisanId);
  form.append('title', title);
  form.append('description', description || '');
  form.append('category', category);
  form.append('rawCost', String(rawCost));
  form.append('laborHours', String(laborHours));
  form.append('weightOrSize', String(weightOrSize || 1));
  if (skillLevel) form.append('skillLevel', skillLevel);

  if (imageAsset) {
    form.append('image', {
      uri: imageAsset.uri,
      name: imageAsset.fileName || 'craft-photo.jpg',
      type: imageAsset.mimeType || 'image/jpeg',
    });
  }

  const { data } = await api.post('/api/products/catalog', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getArtisanCatalog(artisanId, status) {
  const { data } = await api.get(`/api/products/artisan/${artisanId}`, {
    params: status ? { status } : {},
  });
  return data;
}

export async function updateProduct(productId, payload) {
  const { data } = await api.patch(`/api/products/${productId}`, payload);
  return data;
}

export async function deleteProduct(productId) {
  const { data } = await api.delete(`/api/products/${productId}`);
  return data;
}

// ---------- Marketplace (public buyer feed) ----------
export async function getMarketplaceFeed(params = {}) {
  const { data } = await api.get('/api/marketplace/products', { params });
  return data;
}

export async function getMarketplaceProduct(productId) {
  const { data } = await api.get(`/api/marketplace/products/${productId}`);
  return data;
}

export default api;
