
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

router.get('/history', async (req, res) => {
  try {
    const { asin, range } = req.query;

    if (!asin) {
      return res.status(400).json({ success: false, error: 'ASIN is required' });
    }

    const product = await Product.findOne({ asin });
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    let priceHistory = product.priceHistory || [];

    if (range === '7d' || range === '30d') {
      const days = range === '7d' ? 7 : 30;
      const threshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      priceHistory = priceHistory.filter(entry => new Date(entry.date) >= threshold);
    }

    res.json({
      success: true,
      data: {
        asin: product.asin,
        title: product.title,
        image: product.image,
        priceHistory,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
