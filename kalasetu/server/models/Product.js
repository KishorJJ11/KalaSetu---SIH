const mongoose = require('mongoose');

const PRODUCT_STATUS = ['draft', 'processing', 'live', 'sold_out', 'archived'];

const priceBreakdownSchema = new mongoose.Schema(
  {
    materialCost: Number,
    fairArtisanWage: Number,
    hourlyWageApplied: Number,
    sizeOverheadFactor: Number,
    baseCost: Number,
    marginAppliedPercent: Number,
  },
  { _id: false }
);

const pricePointsSchema = new mongoose.Schema(
  {
    suggestedMinimumPrice: Number,
    recommendedMarketPrice: Number,
    highDemandFestivalPrice: Number,
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      minlength: 2,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
    },
    rawCost: {
      type: Number,
      required: true,
      min: 0,
    },
    laborHours: {
      type: Number,
      required: true,
      min: 0,
    },
    weightOrSize: {
      type: Number,
      default: 1,
      min: 0,
    },
    priceBreakdown: priceBreakdownSchema,
    pricePoints: pricePointsSchema,
    suggestedPrice: {
      type: Number,
      min: 0,
    },
    finalPrice: {
      type: Number,
      min: 0,
    },
    originalImageUrl: {
      type: String,
      default: '', // Deprecated: keeping for backward compatibility, use images array instead
    },
    studioImageUrl: {
      type: String,
      default: '', // Deprecated: keeping for backward compatibility, use images array instead
    },
    images: {
      type: [{
        originalUrl: String,
        studioUrl: String
      }],
      default: []
    },
    status: {
      type: String,
      enum: PRODUCT_STATUS,
      default: 'draft',
    },
    artisanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Artisan',
      required: true,
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isAuction: {
      type: Boolean,
      default: false,
    },
    auctionEndTime: {
      type: Date,
    },
    currentHighestBid: {
      type: Number,
      default: 0,
    },
    auctionStatus: {
      type: String,
      enum: ['active', 'ended', 'accepted', 'rejected'],
    },
    bids: [
      {
        amount: Number,
        bidderName: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

productSchema.index({ artisanId: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

productSchema.virtual('isPricingComplete').get(function isPricingComplete() {
  return Boolean(this.pricePoints && this.pricePoints.recommendedMarketPrice);
});

productSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Product', productSchema);
module.exports.PRODUCT_STATUS = PRODUCT_STATUS;
