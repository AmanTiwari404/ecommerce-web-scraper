'use client'

import { useState } from 'react'
import Image from 'next/image'
import PriceChart from './PriceChart'

interface ProductData {
  title: string
  price: number | string
  image: string
  asin: string
  features?: string[]
  site?: string
}

export default function ScraperForm() {
  const [url, setUrl] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [data, setData] = useState<ProductData | null>(null)
  const [error, setError] = useState<string>('')
  const [darkMode, setDarkMode] = useState<boolean>(false)

  const handleScrape = async () => {
    if (!url.includes('amazon') && !url.includes('flipkart')) {
      setError('Please enter a valid Amazon or Flipkart product URL')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const platform = url.includes('flipkart') ? 'flipkart' : '' // Empty for Amazon
      const API_BASE = "https://ecommerce-web-scraper.onrender.com"; 
      const fetchUrl = `${API_BASE}/api/scrape${platform ? `/${platform}` : ''}?url=${encodeURIComponent(url)}`

      console.log('📡 Fetching:', fetchUrl)

      const res = await fetch(fetchUrl)
      const result = await res.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Scraping failed')
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError('Server error: ' + err.message)
      } else {
        setError('Unknown error occurred')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`${darkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} min-h-screen transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto p-6 mt-10 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-6 text-center">🛒E-commerce Product Price Tracker</h1>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-1 text-sm font-medium border rounded-md shadow bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Toggle {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Enter Amazon or Flipkart product URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inherit"
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {loading ? 'Scraping...' : 'Scrape'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {data && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 grid md:grid-cols-2 gap-8">
            <div className="flex justify-center items-center">
              {data.image && data.image.startsWith('http') && (
                <Image
                  src={data.image}
                  alt="Product"
                  width={320}
                  height={320}
                  className="rounded-lg shadow-md object-contain"
                />
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">{data.title}</h2>
              <p className="text-green-500 text-xl font-bold">₹ {data.price}</p>

              {data.features && data.features.length > 0 && (
                <ul className="list-disc list-inside space-y-1">
                  {data.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              )}

              {data.asin && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-2">Price History</h3>
                  <PriceChart asin={data.asin} isDarkMode={darkMode} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
