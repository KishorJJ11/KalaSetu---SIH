const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Artisan = require('../models/Artisan');

const router = express.Router();

function absoluteUrl(req, relativePath) {
  if (!relativePath) return '';
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

// POST /api/ondc/publish/:productId
router.post(
  '/publish/:productId',
  asyncHandler(async (req, res) => {
    const { productId } = req.params;

    if (!mongoose.isValidObjectId(productId)) {
      res.status(400);
      throw new Error('Invalid product ID');
    }

    // Populate artisan to get artisan name
    const product = await Product.findById(productId).populate('artisanId');

    if (!product) {
      res.status(404);
      throw new Error('Product not found');
    }

    const artisan = product.artisanId;
    
    // Choose the best image to showcase
    let displayImageUrl = product.studioImageUrl || product.originalImageUrl;
    if (!displayImageUrl && product.images && product.images.length > 0) {
      displayImageUrl = product.images[0].studioUrl || product.images[0].originalUrl;
    }
    const fullImageUrl = absoluteUrl(req, displayImageUrl);

    // ONDC Beckn protocol compatible catalog payload structure
    const ondcCatalogPayload = {
      context: {
        domain: 'retail:b2c',
        country: 'IND',
        city: 'std:080', // Example city code
        action: 'catalog_sync',
        core_version: '1.2.0',
        bap_id: 'kalasetu-mock-buyer.in',
        bap_uri: 'https://api.kalasetu.in/ondc',
        transaction_id: 'T_' + Date.now(),
        message_id: 'M_' + Date.now(),
        timestamp: new Date().toISOString(),
      },
      message: {
        catalog: {
          descriptor: {
            name: 'KalaSetu Artisan Marketplace',
            symbol: 'https://kalasetu.in/logo.png',
            short_desc: 'AI-driven marketplace for marginalized artisans',
            long_desc: 'Empowering rural artisans via ONDC network connectivity.',
          },
          providers: [
            {
              id: artisan ? artisan._id.toString() : 'ARTISAN_NODE_01',
              descriptor: {
                name: artisan ? artisan.name : 'Handicraft Artisan',
              },
              items: [
                {
                  id: product._id.toString(),
                  descriptor: {
                    name: product.title,
                    short_desc: product.description,
                    images: fullImageUrl ? [fullImageUrl] : [],
                  },
                  price: {
                    currency: 'INR',
                    value: (product.finalPrice || product.suggestedPrice || 0).toString(),
                  },
                  category_id: product.category,
                  fulfillment_id: 'F1',
                },
              ],
            },
          ],
        },
      },
    };

    // For SIH Prototype: Return success response mimicking ONDC Gateway acknowledgement
    return res.status(200).json({
      success: true,
      message: 'Product successfully synced with ONDC Mock Gateway!',
      ondc_payload_sent: ondcCatalogPayload,
    });
  })
);

module.exports = router;
