require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const artisanRoutes = require('./routes/artisanRoutes');
const productRoutes = require('./routes/productRoutes');
const marketplaceRoutes = require('./routes/marketplaceRoutes');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 5000;

connectDB();

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || '*',
  })
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Serve uploaded images (originals + AI studio-enhanced) statically.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'kalasetu-server', timestamp: new Date().toISOString() });
});

app.use('/api/artisans', artisanRoutes);
app.use('/api/products', productRoutes);
app.use('/api/marketplace', marketplaceRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[KalaSetu] Server running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});

module.exports = app;
