import axios from 'axios';
import { Platform } from 'react-native';

const DEV_HOST = '10.0.1.209'; // College Wi-Fi IP
export const API_BASE_URL = `http://${DEV_HOST}:5000`;
export const AI_BASE_URL = `http://${DEV_HOST}:8000`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ---------- Artisan endpoints ----------
export async function registerArtisan(payload) {
  const { data } = await api.post('/api/artisans/register', payload);
  return data;
}

export async function loginArtisan(phone) {
  const { data } = await api.post('/api/artisans/login', { phone });
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

export async function createProduct({ artisanId, title, description, category, rawCost, laborHours, weightOrSize, skillLevel, imageAsset, finalPrice }) {
  const form = new FormData();
  form.append('artisanId', artisanId);
  form.append('title', title);
  form.append('description', description || '');
  form.append('category', category);
  form.append('rawCost', String(rawCost));
  form.append('laborHours', String(laborHours));
  form.append('weightOrSize', String(weightOrSize || 1));
  if (skillLevel) form.append('skillLevel', skillLevel);
  if (finalPrice) form.append('finalPrice', String(finalPrice));

  if (imageAsset) {
    form.append('image', {
      uri: imageAsset.uri,
      name: imageAsset.fileName || 'craft-photo.jpg',
      type: imageAsset.mimeType || 'image/jpeg',
    });
  }

  const { data } = await api.post('/api/products/catalog', form);
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
