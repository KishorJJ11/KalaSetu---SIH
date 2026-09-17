/**
 * Seeds the database with a demo artisan for local testing.
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Artisan = require('../models/Artisan');

async function seed() {
  await connectDB();

  const existing = await Artisan.findOne({ phone: '9876543210' });
  if (existing) {
    console.log('[KalaSetu] Demo artisan already exists:', existing._id.toString());
    await mongoose.disconnect();
    return;
  }

  const artisan = await Artisan.create({
    name: 'Lakshmi Devi',
    phone: '9876543210',
    craftCategory: 'pottery',
    skillLevel: 'master',
    state: 'Odisha',
    district: 'Puri',
    languagePreference: 'hindi',
    upiId: 'lakshmidevi@upi',
    mosjeSchemeEnrolled: true,
    isVerified: true,
  });

  console.log('[KalaSetu] Demo artisan created:', artisan._id.toString());
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('[KalaSetu] Seed failed:', err);
  process.exit(1);
});
