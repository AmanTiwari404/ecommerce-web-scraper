'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface PriceEntry {
  price: number
  date: string
}

export default function PriceChart({
  asin,
  range = '30d',
}: {
  asin: string
  range?: '7d' | '30d'
}) {
  const [priceHistory, setPriceHistory] = useState<PriceEntry[]>([])

  useEffect(() => {
    const fetchPriceHistory = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/history?asin=${asin}&range=${range}`)
        const result = await res.json()

        if (result.success && result.data.priceHistory) {
          const formatted = result.data.priceHistory.map((entry: PriceEntry) => ({
            price: entry.price,
            date: new Date(entry.date).toLocaleDateString(), 
          }))
          setPriceHistory(formatted)
        }
      } catch (err) {
        console.error('Failed to fetch price history', err)
      }
    }

    fetchPriceHistory()
  }, [asin, range])

  if (priceHistory.length === 0) return null

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-2">Price History</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={priceHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
