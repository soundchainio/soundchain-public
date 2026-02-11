/**
 * Manage Royalty Splitter Modal
 * Allows artists to add/edit royalty splits on EXISTING minted NFTs
 * Integrates with RoyaltySplitterFactory contract
 */

import React, { useState } from 'react'
import { X, Plus, Trash2, Users, Clock, ExternalLink, AlertTriangle } from 'lucide-react'
import classNames from 'classnames'
import { L2_CONTRACTS, ROYALTY_SPLITTER_CONFIG } from 'constants/l2Contracts'

interface Collaborator {
  address: string
  percentage: number
  role: string
}

interface ManageRoyaltySplitterModalProps {
  isOpen: boolean
  onClose: () => void
  editionId: string
  trackTitle: string
  currentRoyaltyReceiver?: string
  existingSplits?: Collaborator[]
}

const ROLE_OPTIONS = [
  'Producer',
  'Singer',
  'Songwriter',
  'Beatmaker',
  'Engineer',
  'Featured Artist',
  'Guitarist',
  'Drummer',
  'Other',
]

export const ManageRoyaltySplitterModal: React.FC<ManageRoyaltySplitterModalProps> = ({
  isOpen,
  onClose,
  editionId,
  trackTitle,
  currentRoyaltyReceiver,
  existingSplits = [],
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>(
    existingSplits.length > 0
      ? existingSplits
      : [{ address: '', percentage: 100, role: 'Producer' }]
  )
  const [isDeploying, setIsDeploying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalPercentage = collaborators.reduce((sum, c) => sum + c.percentage, 0)
  const isValid = totalPercentage === 100 && collaborators.every(c => c.address && c.percentage > 0)

  const hasSplitter = currentRoyaltyReceiver &&
    currentRoyaltyReceiver.toLowerCase() !== L2_CONTRACTS.TREASURY.toLowerCase()

  const addCollaborator = () => {
    if (collaborators.length >= ROYALTY_SPLITTER_CONFIG.MAX_COLLABORATORS) {
      setError(`Maximum ${ROYALTY_SPLITTER_CONFIG.MAX_COLLABORATORS} collaborators allowed`)
      return
    }
    setCollaborators([...collaborators, { address: '', percentage: 0, role: 'Other' }])
  }

  const removeCollaborator = (index: number) => {
    if (collaborators.length <= 1) return
    setCollaborators(collaborators.filter((_, i) => i !== index))
  }

  const updateCollaborator = (index: number, field: keyof Collaborator, value: string | number) => {
    const updated = [...collaborators]
    updated[index] = { ...updated[index], [field]: value }
    setCollaborators(updated)
    setError(null)
  }

  const handleDeploy = async () => {
    if (!isValid) {
      setError('Please ensure all fields are filled and percentages total 100%')
      return
    }

    setIsDeploying(true)
    setError(null)

    try {
      // TODO: Integrate with RoyaltySplitterFactory contract
      // 1. Deploy new RoyaltySplitter via factory
      // 2. Update NFT edition's royaltyReceiver to splitter address
      // 3. Save splitter data to backend

      console.log('Deploying splitter for edition:', editionId)
      console.log('Collaborators:', collaborators)

      // Simulate deployment for now
      await new Promise(resolve => setTimeout(resolve, 2000))

      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deploy splitter')
    } finally {
      setIsDeploying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-neutral-900 rounded-2xl border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold">Manage Royalty Splits</h2>
              <p className="text-gray-400 text-sm truncate max-w-[250px]">{trackTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {/* Info Banner */}
          <div className="mb-4 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-purple-400 mt-0.5" />
              <div>
                <p className="text-purple-400 text-sm font-medium">48-Hour Timelock</p>
                <p className="text-gray-400 text-xs">
                  Changes take effect after 48 hours. This protects collaborators from sudden changes.
                </p>
              </div>
            </div>
          </div>

          {/* Collaborators List */}
          <div className="space-y-3">
            {collaborators.map((collab, index) => (
              <div
                key={index}
                className="p-3 rounded-xl bg-black/40 border border-white/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Collaborator {index + 1}</span>
                  {collaborators.length > 1 && (
                    <button
                      onClick={() => removeCollaborator(index)}
                      className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Wallet Address */}
                <input
                  type="text"
                  placeholder="0x... wallet address"
                  value={collab.address}
                  onChange={(e) => updateCollaborator(index, 'address', e.target.value)}
                  className="w-full px-3 py-2 mb-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm placeholder-gray-500 focus:border-cyan-500 focus:outline-none"
                />

                <div className="flex gap-2">
                  {/* Role */}
                  <select
                    value={collab.role}
                    onChange={(e) => updateCollaborator(index, 'role', e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                  >
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>

                  {/* Percentage */}
                  <div className="relative w-24">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={collab.percentage}
                      onChange={(e) => updateCollaborator(index, 'percentage', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 pr-8 rounded-lg bg-black/40 border border-white/10 text-white text-sm focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Collaborator Button */}
          {collaborators.length < ROYALTY_SPLITTER_CONFIG.MAX_COLLABORATORS && (
            <button
              onClick={addCollaborator}
              className="w-full mt-3 py-2 rounded-xl border border-dashed border-white/20 text-gray-400 hover:border-cyan-500/50 hover:text-cyan-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Collaborator
            </button>
          )}

          {/* Total Percentage */}
          <div className={classNames(
            'mt-4 p-3 rounded-xl flex items-center justify-between',
            totalPercentage === 100
              ? 'bg-green-500/10 border border-green-500/20'
              : 'bg-red-500/10 border border-red-500/20'
          )}>
            <span className="text-gray-400">Total</span>
            <span className={classNames(
              'font-bold',
              totalPercentage === 100 ? 'text-green-400' : 'text-red-400'
            )}>
              {totalPercentage}%
            </span>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-white/20 text-gray-400 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeploy}
              disabled={!isValid || isDeploying}
              className={classNames(
                'flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2',
                isValid && !isDeploying
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              {isDeploying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Deploying...
                </>
              ) : hasSplitter ? (
                'Update Splits'
              ) : (
                'Deploy Splitter'
              )}
            </button>
          </div>

          {/* Contract Link */}
          <a
            href={`https://polygonscan.com/address/${L2_CONTRACTS.ROYALTY_SPLITTER_FACTORY}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-1 text-gray-500 text-xs hover:text-gray-400"
          >
            <span>Contract: {L2_CONTRACTS.ROYALTY_SPLITTER_FACTORY.slice(0, 10)}...</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
}

export default ManageRoyaltySplitterModal
