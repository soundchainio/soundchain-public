/**
 * Developer Portal Page
 *
 * Allows developers/startups to create API keys and
 * manage their announcements on SoundChain.
 */

import { Button } from 'components/common/Buttons/Button'
import SEO from 'components/SEO'
import { useMe } from 'hooks/useMe'
import { protectPage } from 'lib/protectPage'
import { cacheFor } from 'lib/apollo'
import { useState } from 'react'
import { Copy, Key, Plus, RefreshCw, Trash2, ExternalLink, Eye, MousePointer } from 'lucide-react'

export const getServerSideProps = protectPage((context, apolloClient) => {
  return cacheFor(DevelopersPage, {}, context, apolloClient)
})

// Mock data for now - will be replaced with GraphQL queries
const mockApiKeys = [
  {
    id: '1',
    keyPrefix: 'sc_live_abc1...xyz9',
    companyName: 'My Startup',
    tier: 'FREE',
    status: 'ACTIVE',
    totalRequests: 42,
    dailyRequestCount: 5,
    createdAt: new Date().toISOString(),
  },
]

export default function DevelopersPage() {
  const me = useMe()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <SEO
        title="Developer Portal | SoundChain"
        description="Build on SoundChain. Get API access to post announcements and integrate with the Web3 music platform."
        canonicalUrl="/developers"
      />
      <div className="min-h-screen bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              Developer Portal
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Build on SoundChain. Get API access to post announcements
              and reach the Web3 music community.
            </p>
          </div>

          {/* Quick Start */}
          <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Quick Start</h2>
            <div className="bg-gray-900/50 rounded-lg p-4 font-mono text-sm overflow-x-auto">
              <pre className="text-gray-300">
{`curl -X POST https://api.soundchain.io/v1/announcements \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "🚀 Our New Feature",
    "content": "We just launched...",
    "link": "https://yourapp.com",
    "type": "PRODUCT_LAUNCH"
  }'`}
              </pre>
            </div>
          </div>

          {/* New Key Alert */}
          {newKey && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 mb-8">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-2">
                    🔑 Your New API Key
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">
                    Copy this key now - you won't be able to see it again!
                  </p>
                  <code className="bg-gray-900 px-4 py-2 rounded text-green-400 font-mono">
                    {newKey}
                  </code>
                </div>
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(newKey)}
                >
                  {copied ? 'Copied!' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}

          {/* API Keys Section */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400" />
                Your API Keys
              </h2>
              <Button
                variant="outline"
                borderColor="bg-cyan-gradient"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </div>

            {/* Create Form */}
            {showCreateForm && (
              <div className="bg-gray-900/50 rounded-lg p-6 mb-6 border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4">Create API Key</h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Company / Startup Name *
                    </label>
                    <input
                      type="text"
                      placeholder="Your Company Name"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Contact Email *
                    </label>
                    <input
                      type="email"
                      placeholder="dev@yourcompany.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      placeholder="https://yourcompany.com"
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1">
                      Description
                    </label>
                    <textarea
                      placeholder="What are you building?"
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      borderColor="bg-cyan-gradient"
                      onClick={() => {
                        setNewKey('sc_live_' + Math.random().toString(36).slice(2))
                        setShowCreateForm(false)
                      }}
                    >
                      Create API Key
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {/* Keys List */}
            <div className="space-y-4">
              {mockApiKeys.map((key) => (
                <div
                  key={key.id}
                  className="bg-gray-900/50 rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{key.companyName}</p>
                      <p className="text-sm font-mono text-gray-400">{key.keyPrefix}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        key.status === 'ACTIVE'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {key.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {key.tier} • {key.dailyRequestCount}/10 daily
                      </span>
                      <div className="flex gap-2">
                        <button className="p-2 hover:bg-gray-700 rounded">
                          <RefreshCw className="w-4 h-4 text-gray-400" />
                        </button>
                        <button className="p-2 hover:bg-gray-700 rounded">
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-gray-800/50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-bold text-white mb-4">Rate Limits</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { tier: 'FREE', limit: '10/day', price: 'Free' },
                { tier: 'STARTER', limit: '50/day', price: '$9/mo' },
                { tier: 'PRO', limit: '500/day', price: '$49/mo' },
                { tier: 'ENTERPRISE', limit: 'Unlimited', price: 'Contact us' },
              ].map((plan) => (
                <div
                  key={plan.tier}
                  className="bg-gray-900/50 rounded-lg p-4 text-center"
                >
                  <p className="text-sm font-bold text-cyan-400">{plan.tier}</p>
                  <p className="text-2xl font-bold text-white">{plan.limit}</p>
                  <p className="text-xs text-gray-500">{plan.price}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Announcement Types */}
          <div className="bg-gray-800/50 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Announcement Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { type: 'PRODUCT_LAUNCH', label: 'Product Launch', icon: '🚀' },
                { type: 'FEATURE_UPDATE', label: 'Feature Update', icon: '✨' },
                { type: 'PARTNERSHIP', label: 'Partnership', icon: '🤝' },
                { type: 'EVENT', label: 'Event', icon: '📅' },
                { type: 'COMMUNITY', label: 'Community', icon: '👥' },
                { type: 'OTHER', label: 'Other', icon: '📢' },
              ].map((item) => (
                <div
                  key={item.type}
                  className="bg-gray-900/50 rounded-lg p-4 flex items-center gap-3"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="font-medium text-white">{item.label}</p>
                    <code className="text-xs text-gray-500">{item.type}</code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Logged in as <span className="text-cyan-400">@{me?.handle}</span>
            </p>
            <p className="mt-2">
              <a href="/announcements" className="text-cyan-400 hover:underline">
                View Announcements Feed →
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
