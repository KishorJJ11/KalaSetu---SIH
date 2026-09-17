const express = require('express');
const asyncHandler = require('express-async-handler');

const Product = require('../models/Product');

const router = express.Router();

function absoluteUrl(req, relativePath) {
  if (!relativePath) return '';
  return `${req.protocol}://${req.get('host')}${relativePath}`;
}

// GET /api/marketplace/products -> public buyer-facing feed of live products
// Supports: ?category=pottery&state=Odisha&search=vase&page=1&limit=20&sort=newest|price_low|price_high
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { category, search, page = 1, limit = 20, sort = 'newest' } = req.query;

    const filter = { status: 'live' };
    if (category) filter.category = String(category).toLowerCase();
    if (search) filter.$text = { $search: search };

    const sortMap = {
      newest: { createdAt: -1 },
      price_low: { finalPrice: 1 },
      price_high: { finalPrice: -1 },
    };
    const sortOption = sortMap[sort] || sortMap.newest;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('artisanId', 'name craftCategory state district profileImageUrl isVerified')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    const data = products.map((p) => ({
      id: p._id,
      title: p.title,
      description: p.description,
      category: p.category,
      finalPrice: p.finalPrice,
      studioImageUrl: absoluteUrl(req, p.studioImageUrl),
      artisan: p.artisanId
        ? {
            id: p.artisanId._id,
            name: p.artisanId.name,
            craftCategory: p.artisanId.craftCategory,
            state: p.artisanId.state,
            district: p.artisanId.district,
            isVerified: p.artisanId.isVerified,
          }
        : null,
      createdAt: p.createdAt,
    }));

    res.json({
      success: true,
      count: data.length,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
      data,
    });
  })
);

// GET /api/marketplace/products/:productId -> single product buyer view
router.get(
  '/products/:productId',
  asyncHandler(async (req, res) => {
    const product = await Product.findOneAndUpdate(
      { _id: req.params.productId, status: 'live' },
      { $inc: { viewCount: 1 } },
      { new: true }
    ).populate('artisanId', 'name craftCategory state district profileImageUrl isVerified upiId');

    if (!product) {
      res.status(404);
      throw new Error('Product not found or not currently live.');
    }

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        originalImageUrl: absoluteUrl(req, product.originalImageUrl),
        studioImageUrl: absoluteUrl(req, product.studioImageUrl),
      },
    });
  })
);

module.exports = router;
