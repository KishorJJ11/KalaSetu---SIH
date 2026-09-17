const axios = require('axios');
const FormData = require('form-data');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';

const aiClient = axios.create({
  baseURL: AI_SERVICE_URL,
  timeout: 30000,
});

/**
 * Sends an image buffer to the Python AI microservice for background
 * removal + studio compositing. Returns the enhanced PNG buffer.
 * @param {Buffer} imageBuffer
 * @param {string} filename
 * @param {string} mimetype
 * @returns {Promise<Buffer>}
 */
async function enhanceImage(imageBuffer, filename, mimetype) {
  const form = new FormData();
  form.append('file', imageBuffer, { filename, contentType: mimetype });
  form.append('return_format', 'binary');

  const response = await aiClient.post('/api/ai/enhance-image', form, {
    headers: form.getHeaders(),
    responseType: 'arraybuffer',
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  return Buffer.from(response.data);
}

/**
 * Requests a structured price suggestion from the Python AI microservice.
 * @param {{category: string, rawMaterialCost: number, hoursSpent: number, skillLevel: string, weightOrSize: number}} payload
 */
async function suggestPrice(payload) {
  const response = await aiClient.post('/api/ai/suggest-price', payload);
  return response.data;
}

module.exports = { enhanceImage, suggestPrice, AI_SERVICE_URL };
