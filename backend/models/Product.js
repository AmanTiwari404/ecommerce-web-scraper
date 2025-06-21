const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  price: Number,
  date: {
    type: Date,
    default: Date.now,
  },
});

const productSchema = new mongoose.Schema({
  asin: {
    type: String,
    required: true,
    unique: true,
  },
  title: String,
  image: String,
  priceHistory: [priceSchema],
});

module.exports = mongoose.model('Product', productSchema);
