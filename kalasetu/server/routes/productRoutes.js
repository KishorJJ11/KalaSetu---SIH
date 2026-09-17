const express = require('express');
const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');

const Product = require('../models/Product');
const Artisan = require('../models/Artisan');
const upload = require('../middleware/upload');
const { enhanceImage, suggestPrice } = require('../utils/aiServiceClient');
const { saveImageBuffer, extensionFromMimetype } = require('../utils/fileStorage');

const router = express.Router();

function absoluteUrl(req, relativePath) {
  if (!relativePath) return '';
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

// POST /api/products/catalog
// Orchestrates: save original -> call AI enhance-image -> save studio image
// -> (optionally) call AI suggest-price -> persist Product document.
router.post(
  '/catalog',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const {
      artisanId,
      title,
      description,
      category,
      rawCost,
      laborHours,
      weightOrSize,
      skillLevel,
    } = req.body;

    if (!artisanId || !mongoose.isValidObjectId(artisanId)) {
      res.status(400);
      throw new Error('A valid artisanId is required.');
    }
    if (!title || !category || rawCost === undefined || laborHours === undefined) {
      res.status(400);
      throw new Error('title, category, rawCost, and laborHours are required.');
    }

    const artisan = await Artisan.findById(artisanId);
    if (!artisan) {
      res.status(404);
      throw new Error('Artisan not found.');
    }

    const product = new Product({
      title,
      description: description || '',
      category: String(category).toLowerCase(),
      rawCost: Number(rawCost),
      laborHours: Number(laborHours),
      weightOrSize: weightOrSize ? Number(weightOrSize) : 1,
      artisanId: artisan._id,
      status: 'processing',
    });

    // Step 1: persist original image + call AI enhancement, if provided.
    if (req.file) {
      const ext = extensionFromMimetype(req.file.mimetype);
      const originalPath = saveImageBuffer(req.file.buffer, 'originals', ext);
      product.originalImageUrl = originalPath;

      try {
        const enhancedBuffer = await enhanceImage(req.file.buffer, req.file.originalname, req.file.mimetype);
        const studioPath = saveImageBuffer(enhancedBuffer, 'studio', 'png');
        product.studioImageUrl = studioPath;
      } catch (err) {
        console.error('[KalaSetu] AI image enhancement failed:', err.message);
        // Non-fatal: artisan can retry enhancement later; product still saves.
      }
    }

    // Step 2: call AI pricing engine.
    try {
      const pricing = await suggestPrice({
        category: product.category,
        rawMaterialCost: product.rawCost,
        hoursSpent: product.laborHours,
        skillLevel: skillLevel || artisan.skillLevel || 'skilled',
        weightOrSize: product.weightOrSize,
      });
      product.priceBreakdown = pricing.breakdown;
      product.pricePoints = pricing.pricePoints;
      product.suggestedPrice = pricing.pricePoints.recommendedMarketPrice;
      product.finalPrice = pricing.pricePoints.recommendedMarketPrice;
    } catch (err) {
      console.error('[KalaSetu] AI pricing suggestion failed:', err.message);
    }

    product.status = product.studioImageUrl ? 'live' : 'draft';
    await product.save();

    const responseData = product.toObject();
    responseData.originalImageUrl = absoluteUrl(req, product.originalImageUrl);
    responseData.studioImageUrl = absoluteUrl(req, product.studioImageUrl);

    res.status(201).json({
      success: true,
      message: 'Product catalogued successfully.',
      data: responseData,
    });
  })
);

// POST /api/products/price-check  (proxy to Python AI service, no persistence)
router.post(
  '/price-check',
  asyncHandler(async (req, res) => {
    const { category, rawMaterialCost, hoursSpent, skillLevel, weightOrSize } = req.body;
    if (!category || rawMaterialCost === undefined || hoursSpent === undefined || !skillLevel) {
      res.status(400);
      throw new Error('category, rawMaterialCost, hoursSpent, and skillLevel are required.');
    }

    const pricing = await suggestPrice({
      category,
      rawMaterialCost: Number(rawMaterialCost),
      hoursSpent: Number(hoursSpent),
      skillLevel,
      weightOrSize: weightOrSize ? Number(weightOrSize) : 1,
    });

    res.json({ success: true, data: pricing });
  })
);

// PUT /api/products/:productId/enhance -> re-run AI enhancement on an existing product's original image
router.put(
  '/:productId/enhance',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }
    if (!req.file) {
      res.status(400);
      throw new Error('An image file is required to re-run enhancement.');
    }

    const ext = extensionFromMimetype(req.file.mimetype);
    product.originalImageUrl = saveImageBuffer(req.file.buffer, 'originals', ext);

    const enhancedBuffer = await enhanceImage(req.file.buffer, req.file.originalname, req.file.mimetype);
    product.studioImageUrl = saveImageBuffer(enhancedBuffer, 'studio', 'png');
    product.status = 'live';
    await product.save();

    res.json({
      success: true,
      message: 'Image re-enhanced successfully.',
      data: {
        ...product.toObject(),
        originalImageUrl: absoluteUrl(req, product.originalImageUrl),
        studioImageUrl: absoluteUrl(req, product.studioImageUrl),
      },
    });
  })
);

// GET /api/products/artisan/:artisanId -> fetch an artisan's full catalog
router.get(
  '/artisan/:artisanId',
  asyncHandler(async (req, res) => {
    const { artisanId } = req.params;
    if (!mongoose.isValidObjectId(artisanId)) {
      res.status(400);
      throw new Error('Invalid artisanId.');
    }

    const { status } = req.query;
    const filter = { artisanId };
    if (status) filter.status = status;

    const products = await Product.find(filter).sort({ createdAt: -1 });

    const data = products.map((p) => ({
      ...p.toObject(),
      originalImageUrl: absoluteUrl(req, p.originalImageUrl),
      studioImageUrl: absoluteUrl(req, p.studioImageUrl),
    }));

    res.json({ success: true, count: data.length, data });
  })
);

// PATCH /api/products/:productId -> update price/status/description
router.patch(
  '/:productId',
  asyncHandler(async (req, res) => {
    const allowedFields = ['title', 'description', 'finalPrice', 'status', 'tags'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const product = await Product.findByIdAndUpdate(req.params.productId, updates, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }

    res.json({ success: true, message: 'Product updated.', data: product });
  })
);

// DELETE /api/products/:productId
router.delete(
  '/:productId',
  asyncHandler(async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }
    res.json({ success: true, message: 'Product removed.' });
  })
);

module.exports = router;
