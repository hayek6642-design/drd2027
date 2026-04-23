import React, { useState, useEffect } from 'react'

const AssetsTab = ({ token }) => {
  const [assets, setAssets] = useState([])
  const [wallet, setWallet] = useState({ codes: 0, silver_bars: 0, gold_bars: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch user's assets and wallet
  const fetchAssets = async () => {
    try {
      setLoading(true)
      const [assetsResponse, walletResponse] = await Promise.all([
        fetch('/api/assets/me', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/assets/me', {
          headers: {
            'Authorization': token ? `Bearer ${token}` : undefined,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (!assetsResponse.ok || !walletResponse.ok) {
        throw new Error('Failed to fetch assets')
      }

      const assetsData = await assetsResponse.json()
      const walletData = await walletResponse.json()

      setAssets(assetsData)
      setWallet(walletData.wallet || { codes: 0, silver_bars: 0, gold_bars: 0 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // SSE subscription for real-time asset updates
  useEffect(() => {
    const eventSource = new EventSource('/api/logicode/events/stream?channel=assets')

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.event === 'view' || data.event === 'rent' || data.event === 'purchase') {
        // Refresh assets and wallet
        fetchAssets()
      }
    }

    eventSource.onerror = (err) => {
      console.error('Assets SSE error:', err)
    }

    // Initial fetch
    fetchAssets()

    return () => eventSource.close()
  }, [token])

  if (loading) return <div className="text-center py-4">Loading assets...</div>
  if (error) return <div className="text-red-500 text-center py-4">Error: {error}</div>

  return (
    <div className="space-y-6">
      {/* Wallet Balance */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">💰 Your Wallet</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{wallet.codes || 0}</div>
            <div className="text-sm text-gray-600">Codes</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-600">{wallet.silver_bars || 0}</div>
            <div className="text-sm text-gray-600">Silver Bars</div>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{wallet.gold_bars || 0}</div>
            <div className="text-sm text-gray-600">Gold Bars</div>
          </div>
        </div>
      </div>

      {/* Owned Assets */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">🖼️ Your Assets</h3>
        {assets.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No assets yet. Explore and earn rewards!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
                <img
                  src={asset.url}
                  alt={asset.caption}
                  className="w-full h-32 object-cover rounded mb-2"
                />
                <h4 className="font-semibold">{asset.caption || 'Untitled'}</h4>
                <p className="text-sm text-gray-600 capitalize">{asset.type}</p>
                <span className={`inline-block mt-2 px-2 py-1 text-xs rounded ${
                  asset.status === 'owned' ? 'bg-green-100 text-green-800' :
                  asset.status === 'rented' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {asset.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Asset Actions */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-4">🎯 Asset Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => {
              // Trigger asset view reward
              fetch('/api/assets/view/test-asset', {
                method: 'POST',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : undefined,
                  'Content-Type': 'application/json'
                }
              })
            }}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            View Asset (+1 Code)
          </button>
          <button
            onClick={() => {
              // Trigger asset rent reward
              fetch('/api/assets/rent/test-asset', {
                method: 'POST',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : undefined,
                  'Content-Type': 'application/json'
                }
              })
            }}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            Rent Asset (+10 Codes)
          </button>
          <button
            onClick={() => {
              // Trigger asset purchase reward
              fetch('/api/assets/purchase/test-asset', {
                method: 'POST',
                headers: {
                  'Authorization': token ? `Bearer ${token}` : undefined,
                  'Content-Type': 'application/json'
                }
              })
            }}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors"
          >
            Purchase Asset (+50 Codes)
          </button>
        </div>
      </div>
    </div>
  )
}

export default AssetsTab