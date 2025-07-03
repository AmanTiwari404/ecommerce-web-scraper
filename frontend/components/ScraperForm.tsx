'use client'

import { useState, useEffect } from 'react'
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

  // Sync darkMode state with <html> class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

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
    <div className={`${darkMode ? 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white' : 'bg-gradient-to-br from-blue-100 via-white to-blue-200 text-gray-900'} min-h-screen transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto p-8 mt-12 rounded-3xl shadow-2xl bg-white/80 dark:bg-gray-900/90 backdrop-blur-md border border-gray-200 dark:border-gray-800">
        <h1 className="text-4xl font-extrabold mb-8 text-center tracking-tight flex items-center justify-center gap-2">
          <span role="img" aria-label="cart">🛒</span>
          E-commerce Product Price Tracker
        </h1>

        <div className="flex justify-end mb-6">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="px-4 py-1 text-sm font-semibold border rounded-lg shadow bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600 transition"
          >
            Toggle {darkMode ? 'Light' : 'Dark'} Mode
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <input
            type="text"
            placeholder="Paste Amazon or Flipkart product URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 px-5 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-inherit text-lg shadow-sm transition"
          />
          <button
            onClick={handleScrape}
            disabled={loading || !url}
            className={`px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-200 ${
              loading || !url
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg'
            } flex items-center gap-2`}
          >
            {loading && (
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
            )}
            {loading ? 'Scraping...' : 'Scrape'}
          </button>
        </div>

        {error && <p className="text-red-600 text-base mb-6 text-center font-medium">{error}</p>}

        {data && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 grid md:grid-cols-2 gap-10 border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col items-center justify-center">
              <div className="mb-4">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase ${data.site === 'flipkart' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {data.site === 'flipkart' ? 'Flipkart' : 'Amazon'}
                </span>
              </div>
              {data.image && data.image.startsWith('http') ? (
                <Image
                  src={data.image}
                  alt="Product"
                  width={320}
                  height={320}
                  className="rounded-lg shadow-md object-contain border border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-80 h-80 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg">
                  <span className="text-gray-500 dark:text-gray-300">No Image</span>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <h2 className="text-2xl font-bold leading-tight">{data.title}</h2>
              <p className="text-green-600 dark:text-green-400 text-2xl font-extrabold">
                ₹ {typeof data.price === 'number' ? data.price : (data.price || 'N/A')}
              </p>

              {data.features && data.features.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-base text-gray-700 dark:text-gray-200">
                  {data.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              )}

              {data.asin && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-3">Price History</h3>
                  <PriceChart asin={data.asin} isDarkMode={darkMode} />
                </div>
              )}
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-gray-500 dark:text-gray-400 text-sm">
          &copy; {new Date().getFullYear()} E-commerce Price Tracker &mdash; Built with Next.js & Tailwind CSS
        </footer>
      </div>
    </div>
  )
}
