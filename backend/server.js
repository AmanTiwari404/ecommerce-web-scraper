const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// 🔌 MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// 📦 Product schema
const productSchema = new mongoose.Schema({
  asin: { type: String, required: true, unique: true },
  title: String,
  image: String,
  currentPrice: Number,
  previousPrice: Number,
  lastChecked: { type: Date, default: Date.now },
});

const Product = require('./models/Product');

//Scraping route
app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const title = await page.$eval('#productTitle', el => el.textContent.trim());

    let priceText = 'Price not found';
    const priceSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-price .a-offscreen',
      '#corePrice_feature_div .a-offscreen',
    ];

    for (const selector of priceSelectors) {
      try {
        priceText = await page.$eval(selector, el => el.textContent.trim());
        if (priceText) break;
      } catch {}
    }

    const price = parseFloat(priceText.replace(/[^\d.]/g, '')) || null;

    let image = 'Image not found';
    try {
      image = await page.$eval('#landingImage', img => img.src);
    } catch {
      try {
        image = await page.$eval('#imgTagWrapperId img', img => img.src);
      } catch {}
    }

    // Get product features
    let features = [];
     try {
        features = await page.$$eval('#feature-bullets ul li span', spans =>
        spans.map(span => span.textContent.trim()).filter(text => !!text)
    );
    } catch {
      features = ['No features found'];
    }

    await browser.close();

    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;

    if (!asin) {
      return res.status(400).json({ success: false, error: 'Invalid ASIN' });
    }

    const existing = await Product.findOne({ asin });

    if (existing) {
      await Product.updateOne(
        { asin },
        {
          $set: {
            title,
            image,
            previousPrice: existing.currentPrice,
            currentPrice: price,
            lastChecked: new Date(),
          },
          $push: {
            priceHistory: {
              price: price,
              date: new Date(),
            },
          },
        }
      );
    } else {
      await Product.create({
        asin,
        title,
        image,
        currentPrice: price,
        previousPrice: null,
        priceHistory: [{ price }],
      });
    }

    return res.json({
      success: true,
      data: {
        title,
        price: price ?? 'Price not found',
        image,
        asin,
        features,
      },
    });
  } catch (error) {
    console.error('Scrape failed:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Scraping failed: ' + error.message,
    });
  }
});


app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

app.get('/api/history', async (req, res) => {
  const { asin } = req.query;

  if (!asin) {
    return res.status(400).json({ success: false, error: 'Missing ASIN' });
  }

  try {
    const product = await Product.findOne({ asin });

    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    return res.json({
      success: true,
      data: {
        asin: product.asin,
        title: product.title,
        image: product.image,
        priceHistory: product.priceHistory, 
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});



