const mongoose = require('mongoose');

const CRAFT_CATEGORIES = [
  'handloom_weaving',
  'pottery',
  'woodcarving',
  'block_printing',
  'bamboo_craft',
  'metal_craft',
  'embroidery',
  'jewelry',
  'leather_craft',
  'other',
];

const LANGUAGE_PREFERENCES = [
  'hindi',
  'english',
  'tamil',
  'telugu',
  'kannada',
  'marathi',
  'bengali',
  'gujarati',
  'odia',
  'punjabi',
  'assamese',
  'malayalam',
];

const artisanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Artisan name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'],
    },
    craftCategory: {
      type: String,
      required: [true, 'Craft category is required'],
      enum: CRAFT_CATEGORIES,
    },
    skillLevel: {
      type: String,
      enum: ['apprentice', 'skilled', 'master', 'national_awardee'],
      default: 'skilled',
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
    },
    district: {
      type: String,
      trim: true,
    },
    languagePreference: {
      type: String,
      enum: LANGUAGE_PREFERENCES,
      default: 'hindi',
    },
    upiId: {
      type: String,
      trim: true,
      match: [/^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/, 'Enter a valid UPI ID'],
    },
    profileImageUrl: {
      type: String,
      default: '',
    },
    mosjeSchemeEnrolled: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    totalEarnings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

artisanSchema.index({ state: 1, craftCategory: 1 });

artisanSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    craftCategory: this.craftCategory,
    skillLevel: this.skillLevel,
    state: this.state,
    district: this.district,
    profileImageUrl: this.profileImageUrl,
    isVerified: this.isVerified,
  };
};

module.exports = mongoose.model('Artisan', artisanSchema);
module.exports.CRAFT_CATEGORIES = CRAFT_CATEGORIES;
module.exports.LANGUAGE_PREFERENCES = LANGUAGE_PREFERENCES;
