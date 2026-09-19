import axios from 'axios';
import { Platform } from 'react-native';

const DEV_HOST = '192.168.255.113'; // College Wi-Fi / Tethering IP
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

export async function createProduct({ artisanId, title, description, category, rawCost, laborHours, weightOrSize, skillLevel, imageAssets, finalPrice }) {
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

  if (imageAssets && imageAssets.length > 0) {
    for (let i = 0; i < imageAssets.length; i++) {
      const asset = imageAssets[i];
      if (Platform.OS === 'web') {
        const res = await fetch(asset.uri);
        const blob = await res.blob();
        form.append('images', blob, asset.fileName || `craft-photo-${i}.jpg`);
      } else {
        form.append('images', {
          uri: asset.uri,
          name: asset.fileName || `craft-photo-${i}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    }
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

export async function askAssistant(text, audioUri) {
  const form = new FormData();
  if (text) {
    form.append('text', text);
  }
  if (audioUri) {
    if (Platform.OS === 'web') {
      const res = await fetch(audioUri);
      const blob = await res.blob();
      form.append('audio', blob, 'voice-note.m4a');
    } else {
      form.append('audio', {
        uri: audioUri,
        name: 'voice-note.m4a',
        type: 'audio/m4a',
      });
    }
  }
  
  // Note: we use AI_BASE_URL because the LLM route is in the Python AI Engine
  const { data } = await axios.post(`${AI_BASE_URL}/api/ai/chat`, form);
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
