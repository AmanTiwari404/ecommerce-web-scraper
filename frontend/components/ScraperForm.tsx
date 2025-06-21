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
}

export default function ScraperForm() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ProductData | null>(null)
  const [error, setError] = useState('')
  const [range, setRange] = useState<'7d' | '30d'>('30d')

  const handleScrape = async () => {
    if (!url.includes('amazon')) {
      setError('Please enter a valid Amazon product URL')
      return
    }

    setLoading(true)
    setError('')
    setData(null)

    try {
      const res = await fetch(`http://localhost:5000/api/scrape?url=${encodeURIComponent(url)}`)
      const result = await res.json()

      if (result.success) {
        setData(result.data)
      } else {
        setError(result.error || 'Scraping failed')
      }
    } catch (err: any) {
      setError('Server error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-xl mt-10 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Amazon Product Scraper</h1>

      <input
        type="text"
        placeholder="Enter Amazon product URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      
      <div className="flex justify-between items-center mt-2">
        <label className="text-sm font-medium text-gray-600">Price History Range:</label>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as '7d' | '30d')}
          className="px-2 py-1 border rounded-md text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
      </div>

      <button
        onClick={handleScrape}
        disabled={loading || !url}
        className={`w-full text-white px-4 py-2 rounded-lg transition ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {loading ? 'Scraping...' : 'Scrape Product'}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      {data && (
        <div className="border-t pt-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">{data.title}</h2>
          <p className="text-green-600 font-bold">₹ {data.price}</p>

          {data.image && (
            <div className="w-full flex justify-center">
              <Image
                src={data.image}
                alt="Product"
                width={200}
                height={200}
                className="rounded-xl shadow object-contain"
              />
            </div>
          )}

          {data.asin && <PriceChart asin={data.asin} range={range} />}
        </div>
      )}
    </div>
  )
}
