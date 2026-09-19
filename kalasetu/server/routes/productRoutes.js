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
  upload.array('images', 5),
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
      finalPrice,
      isAuction,
      auctionDurationHours
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
      isAuction: isAuction === 'true' || isAuction === true,
    });

    if (product.isAuction && auctionDurationHours) {
      const hours = Number(auctionDurationHours);
      if (!isNaN(hours) && hours > 0) {
        product.auctionEndTime = new Date(Date.now() + hours * 60 * 60 * 1000);
        product.auctionStatus = 'active';
      }
    }

    // Step 1: persist original images + call AI enhancement, if provided.
    if (req.files && req.files.length > 0) {
      const processedImages = [];
      for (const file of req.files) {
        const ext = extensionFromMimetype(file.mimetype);
        const originalPath = saveImageBuffer(file.buffer, 'originals', ext);
        let studioPath = '';

        try {
          const enhancedBuffer = await enhanceImage(file.buffer, file.originalname, file.mimetype);
          studioPath = saveImageBuffer(enhancedBuffer, 'studio', 'png');
        } catch (err) {
          console.error('[KalaSetu] AI image enhancement failed for one image:', err.message);
          // Fallback to original if enhancement fails
          studioPath = originalPath;
        }

        processedImages.push({
          originalUrl: originalPath,
          studioUrl: studioPath || originalPath
        });
      }

      product.images = processedImages;
      // Set the first image as the primary legacy fields for backward compatibility
      if (processedImages.length > 0) {
        product.originalImageUrl = processedImages[0].originalUrl;
        product.studioImageUrl = processedImages[0].studioUrl;
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
      product.finalPrice = finalPrice ? Number(finalPrice) : pricing.pricePoints.recommendedMarketPrice;
    } catch (err) {
      console.error('[KalaSetu] AI pricing suggestion failed:', err.message);
    }

    product.status = (product.images && product.images.length > 0) ? 'live' : 'draft';
    await product.save();

    const responseData = product.toObject();
    responseData.images = responseData.images.map(img => ({
      originalUrl: absoluteUrl(req, img.originalUrl),
      studioUrl: absoluteUrl(req, img.studioUrl)
    }));
    
    // Legacy mapping
    if (responseData.originalImageUrl) responseData.originalImageUrl = absoluteUrl(req, product.originalImageUrl);
    if (responseData.studioImageUrl) responseData.studioImageUrl = absoluteUrl(req, product.studioImageUrl);

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

    const data = products.map((p) => {
      const obj = p.toObject();
      return {
        ...obj,
        originalImageUrl: absoluteUrl(req, obj.originalImageUrl),
        studioImageUrl: absoluteUrl(req, obj.studioImageUrl),
        images: (obj.images || []).map(img => ({
          originalUrl: absoluteUrl(req, img.originalUrl),
          studioUrl: absoluteUrl(req, img.studioUrl)
        }))
      };
    });

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

// POST /api/products/:productId/bid
router.post(
  '/:productId/bid',
  asyncHandler(async (req, res) => {
    const { amount, bidderName } = req.body;
    const bidAmount = Number(amount);

    if (!bidAmount || !bidderName) {
      res.status(400);
      throw new Error('Bid amount and bidderName are required.');
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }

    if (!product.isAuction || product.auctionStatus !== 'active') {
      res.status(400);
      throw new Error('This product is not currently active in an auction.');
    }

    if (product.auctionEndTime && product.auctionEndTime < new Date()) {
      product.auctionStatus = 'ended';
      await product.save();
      res.status(400);
      throw new Error('The auction has already ended.');
    }

    if (bidAmount <= (product.currentHighestBid || 0) && bidAmount <= (product.finalPrice || 0)) {
      res.status(400);
      throw new Error('Bid must be higher than the current highest bid or starting price.');
    }

    product.currentHighestBid = bidAmount;
    product.bids.push({ amount: bidAmount, bidderName });
    await product.save();

    res.json({ success: true, message: 'Bid placed successfully!', data: product });
  })
);

// POST /api/products/:productId/accept-bid
router.post(
  '/:productId/accept-bid',
  asyncHandler(async (req, res) => {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      res.status(404);
      throw new Error('Product not found.');
    }

    if (!product.isAuction) {
      res.status(400);
      throw new Error('Not an auction product.');
    }

    if (product.currentHighestBid <= 0) {
      res.status(400);
      throw new Error('No valid bids to accept.');
    }

    product.auctionStatus = 'accepted';
    product.status = 'sold_out';
    await product.save();

    res.json({ success: true, message: 'Bid accepted and product marked as sold.', data: product });
  })
);

module.exports = router;
