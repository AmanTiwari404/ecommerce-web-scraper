/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'

interface Props {
  asin: string
  isDarkMode: boolean
}

export default function PriceChart({ asin, isDarkMode }: Props) {
  const [data, setData] = useState<{ price: number; date: string }[]>([])
  const [range, setRange] = useState<'7d' | '30d' | 'all'>('30d')

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch(`http://localhost:5000/api/history?asin=${asin}`)
      const result = await res.json()
      if (result.success) {
        let history = result.data.priceHistory || []

        if (range === '7d') {
          const lastWeek = new Date()
          lastWeek.setDate(lastWeek.getDate() - 7)
          history = history.filter((p: any) => new Date(p.date) >= lastWeek)
        } else if (range === '30d') {
          const lastMonth = new Date()
          lastMonth.setDate(lastMonth.getDate() - 30)
          history = history.filter((p: any) => new Date(p.date) >= lastMonth)
        }

        setData(history.map((p: any) => ({
          price: p.price,
          date: new Date(p.date).toLocaleDateString()
        })))
      }
    }

    fetchData()
  }, [asin, range])

  return (
    <div className="w-full">
      <div className="mb-2">
        <select
          value={range}
          onChange={(e) => setRange(e.target.value as any)}
          className="px-3 py-1 border rounded-md dark:bg-gray-800"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All</option>
        </select>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#444' : '#ccc'} />
          <XAxis dataKey="date" stroke={isDarkMode ? '#ccc' : '#333'} />
          <YAxis stroke={isDarkMode ? '#ccc' : '#333'} />
          <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#333' : '#fff' }} />
          <Line type="monotone" dataKey="price" stroke={isDarkMode ? '#90cdf4' : '#1e40af'} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
