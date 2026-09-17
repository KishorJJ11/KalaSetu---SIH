const express = require('express');
const asyncHandler = require('express-async-handler');
const Artisan = require('../models/Artisan');
const Product = require('../models/Product');

const router = express.Router();

// POST /api/artisans/register
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const {
      name,
      phone,
      craftCategory,
      skillLevel,
      state,
      district,
      languagePreference,
      upiId,
      mosjeSchemeEnrolled,
    } = req.body;

    if (!name || !phone || !craftCategory || !state) {
      res.status(400);
      throw new Error('name, phone, craftCategory, and state are required.');
    }

    const existing = await Artisan.findOne({ phone });
    if (existing) {
      res.status(409);
      throw new Error('An artisan is already registered with this phone number.');
    }

    const artisan = await Artisan.create({
      name,
      phone,
      craftCategory,
      skillLevel,
      state,
      district,
      languagePreference,
      upiId,
      mosjeSchemeEnrolled: Boolean(mosjeSchemeEnrolled),
    });

    res.status(201).json({
      success: true,
      message: 'Artisan registered successfully.',
      data: artisan,
    });
  })
);

// POST /api/artisans/login
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
      res.status(400);
      throw new Error('Phone number is required.');
    }

    const artisan = await Artisan.findOne({ phone });
    if (!artisan) {
      res.status(404);
      throw new Error('Phone number not registered. Please sign up.');
    }

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: artisan,
    });
  })
);

// GET /api/artisans/:artisanId
router.get(
  '/:artisanId',
  asyncHandler(async (req, res) => {
    const artisan = await Artisan.findById(req.params.artisanId);
    if (!artisan) {
      res.status(404);
      throw new Error('Artisan not found.');
    }
    res.json({ success: true, data: artisan });
  })
);

// PUT /api/artisans/:artisanId
router.put(
  '/:artisanId',
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'name',
      'craftCategory',
      'skillLevel',
      'state',
      'district',
      'languagePreference',
      'upiId',
      'profileImageUrl',
      'mosjeSchemeEnrolled',
    ];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const artisan = await Artisan.findByIdAndUpdate(req.params.artisanId, updates, {
      new: true,
      runValidators: true,
    });

    if (!artisan) {
      res.status(404);
      throw new Error('Artisan not found.');
    }

    res.json({ success: true, message: 'Profile updated.', data: artisan });
  })
);

// GET /api/artisans/:artisanId/dashboard  -> quick stats for HomeScreen
router.get(
  '/:artisanId/dashboard',
  asyncHandler(async (req, res) => {
    const artisan = await Artisan.findById(req.params.artisanId);
    if (!artisan) {
      res.status(404);
      throw new Error('Artisan not found.');
    }

    const [liveCount, draftCount, totalProducts] = await Promise.all([
      Product.countDocuments({ artisanId: artisan._id, status: 'live' }),
      Product.countDocuments({ artisanId: artisan._id, status: 'draft' }),
      Product.countDocuments({ artisanId: artisan._id }),
    ]);

    res.json({
      success: true,
      data: {
        artisan: artisan.toPublicJSON(),
        stats: {
          liveProducts: liveCount,
          draftProducts: draftCount,
          totalProducts,
          totalEarnings: artisan.totalEarnings,
        },
      },
    });
  })
);

module.exports = router;
