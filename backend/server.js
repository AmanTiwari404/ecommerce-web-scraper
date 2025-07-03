const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const axios = require('axios');
require('dotenv').config();

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in environment variables');
  process.exit(1);
}
if (!process.env.SCRAPER_API_KEY) {
  console.error('❌ SCRAPER_API_KEY not set in environment variables');
  // Not exiting, but Flipkart scraping will fail without this
}

// Connect MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));

const Product = require('./models/Product');

// Amazon Scraping
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
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.$eval('#productTitle', el => el.textContent.trim());

    let price = 'Price not found';
    const priceSelectors = [
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#priceblock_saleprice',
      '.a-price .a-offscreen',
      '#corePrice_feature_div .a-offscreen',
    ];
    for (const selector of priceSelectors) {
      try {
        price = await page.$eval(selector, el => el.textContent.trim());
        if (price) break;
      } catch {}
    }

    let image = null;
    try {
      image = await page.$eval('#landingImage', img => img.src);
    } catch {
      try {
        image = await page.$eval('#imgTagWrapperId img', img => img.src);
      } catch {}
    }

    let features = [];
    try {
      features = await page.$$eval('#feature-bullets ul li span', spans =>
        spans.map(span => span.textContent.trim()).filter(Boolean)
      );
    } catch {
      features = ['No features found'];
    }

    await browser.close();

    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
    const asin = asinMatch ? asinMatch[1] : null;

    if (!asin) return res.status(400).json({ success: false, error: 'Invalid ASIN' });

    const existing = await Product.findOne({ asin });
    const numericPrice = parseFloat(price.replace(/[₹,]/g, '')) || null;

    if (existing) {
      await Product.updateOne(
        { asin },
        {
          $set: {
            title,
            image,
            previousPrice: existing.currentPrice,
            currentPrice: numericPrice,
            lastChecked: new Date(),
          },
          $push: {
            priceHistory: { price: numericPrice, date: new Date() },
          },
        }
      );
    } else {
      await Product.create({
        asin,
        title,
        image,
        currentPrice: numericPrice,
        previousPrice: null,
        priceHistory: [{ price: numericPrice }],
      });
    }

    return res.json({
      success: true,
      data: { title, price: numericPrice, image, asin, features, site: 'amazon' },
    });

  } catch (error) {
    console.error('Amazon scrape failed:', error.message);
    return res.status(500).json({ success: false, error: 'Amazon scraping failed: ' + error.message });
  }
});

// Flipkart Scraping
app.get('/api/scrape/flipkart', async (req, res) => {
  const { url } = req.query;

  if (!url || !url.includes('flipkart')) {
    return res.status(400).json({ success: false, error: 'Invalid Flipkart URL' });
  }

  try {
    const apiKey = process.env.SCRAPER_API_KEY;
    const scraperUrl = `http://api.scraperapi.com?api_key=${apiKey}&url=${encodeURIComponent(url)}`;

    const response = await axios.get(scraperUrl);
    const html = response.data;

    // Check for bot protection/captcha
    if (!html || html.toLowerCase().includes('captcha')) {
      return res.status(500).json({ success: false, error: 'Blocked by Flipkart. Try again later.' });
    }

    const $ = cheerio.load(html);

    // Title
    let title = $('span.B_NuCI').first().text().trim();
    if (!title) title = $('span._35KyD6').first().text().trim();

    // Price
    let priceText = $('div._30jeq3._16Jk6d').first().text().trim();
    if (!priceText) priceText = $('div._30jeq3').first().text().trim();
    const price = parseFloat(priceText.replace(/[₹,]/g, '')) || null;

    // Image
    let image = $('img._396cs4').first().attr('src') || null;
    if (!image) image = $('img._2r_T1I').first().attr('src') || null;

    // Features
    let features = [];
    $('ul._1xgFaf li').each((i, el) => {
      features.push($(el).text().trim());
    });
    if (features.length === 0) {
      $('div._2418kt ul li').each((i, el) => {
        features.push($(el).text().trim());
      });
    }

    // Product ID
    const productIdMatch = url.match(/\/p\/([^/?]+)/);
    const productId = productIdMatch ? productIdMatch[1] : null;

    if (!productId) {
      return res.status(400).json({ success: false, error: 'Invalid product ID' });
    }

    const existing = await Product.findOne({ asin: productId });

    if (existing) {
      await Product.updateOne(
        { asin: productId },
        {
          $set: {
            title,
            image,
            previousPrice: existing.currentPrice,
            currentPrice: price,
            lastChecked: new Date(),
          },
          $push: {
            priceHistory: { price, date: new Date() },
          },
        }
      );
    } else {
      await Product.create({
        asin: productId,
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
        price,
        image,
        features,
        asin: productId,
        site: 'flipkart',
      },
    });

  } catch (error) {
    console.error('Flipkart scrape failed:', error.message);
    return res.status(500).json({ success: false, error: 'Flipkart scraping failed: ' + error.message });
  }
});

// Price History
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

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
