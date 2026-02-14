/**
 * Multi-Token Payment Selector
 * Allows users to choose from 24 supported tokens for NFT purchases
 * Part of L2 Multi-Token Marketplace integration
 */

import React, { useState } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import classNames from 'classnames'
import { SUPPORTED_TOKENS, TOKEN_INFO, getDisplaySymbol, Token } from 'constants/tokens'

interface TokenSelectorProps {
  selectedToken: Token
  onSelectToken: (token: Token) => void
  showBalance?: boolean
  balances?: Record<Token, string>
  disabled?: boolean
  compact?: boolean
  className?: string
}

// Tokens that are currently working (have liquidity/contracts deployed on Polygon)
const ACTIVE_TOKENS: Token[] = ['MATIC', 'OGUN', 'USDC', 'USDT']

// Coming soon tokens (contracts deployed but need whitelisting)
const COMING_SOON_TOKENS: Token[] = SUPPORTED_TOKENS.filter(
  t => !ACTIVE_TOKENS.includes(t)
) as Token[]

export const TokenSelector: React.FC<TokenSelectorProps> = ({
  selectedToken,
  onSelectToken,
  showBalance = false,
  balances = {},
  disabled = false,
  compact = false,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const selectedInfo = TOKEN_INFO[selectedToken]
  const displaySymbol = getDisplaySymbol(selectedToken)

  const handleSelect = (token: Token) => {
    if (COMING_SOON_TOKENS.includes(token)) {
      // Show toast or tooltip that this token is coming soon
      return
    }
    onSelectToken(token)
    setIsOpen(false)
  }

  if (compact) {
    return (
      <div className={classNames('relative', className)}>
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={classNames(
            'flex items-center gap-2 px-3 py-2 rounded-lg',
            'bg-black/40 border border-white/10',
            'hover:border-cyan-500/50 transition-all',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="text-lg">{selectedInfo?.icon}</span>
          <span className="text-white font-medium">{displaySymbol}</span>
          <ChevronDown className={classNames(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </button>

        {isOpen && (
          <TokenDropdown
            selectedToken={selectedToken}
            onSelect={handleSelect}
            balances={balances}
            showBalance={showBalance}
          />
        )}
      </div>
    )
  }

  return (
    <div className={classNames('relative', className)}>
      <label className="block text-gray-400 text-sm mb-2">Pay With</label>

      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={classNames(
          'w-full flex items-center justify-between px-4 py-3 rounded-xl',
          'bg-black/40 border border-white/10',
          'hover:border-cyan-500/50 transition-all',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{selectedInfo?.icon}</span>
          <div className="text-left">
            <p className="text-white font-bold">{displaySymbol}</p>
            <p className="text-gray-400 text-sm">{selectedInfo?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {showBalance && balances[selectedToken] && (
            <span className="text-gray-400 text-sm">
              {parseFloat(balances[selectedToken]).toFixed(4)}
            </span>
          )}
          <ChevronDown className={classNames(
            'w-5 h-5 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )} />
        </div>
      </button>

      {isOpen && (
        <TokenDropdown
          selectedToken={selectedToken}
          onSelect={handleSelect}
          balances={balances}
          showBalance={showBalance}
        />
      )}
    </div>
  )
}

interface TokenDropdownProps {
  selectedToken: Token
  onSelect: (token: Token) => void
  balances: Record<Token, string>
  showBalance: boolean
}

const TokenDropdown: React.FC<TokenDropdownProps> = ({
  selectedToken,
  onSelect,
  balances,
  showBalance,
}) => {
  return (
    <div className={classNames(
      'absolute z-50 w-full mt-2 py-2 rounded-xl',
      'bg-neutral-900 border border-white/10',
      'shadow-xl shadow-black/50',
      'max-h-80 overflow-y-auto'
    )}>
      {/* Active Tokens */}
      <div className="px-3 py-1">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Available Now</p>
      </div>
      {ACTIVE_TOKENS.map(token => (
        <TokenOption
          key={token}
          token={token}
          isSelected={token === selectedToken}
          onSelect={onSelect}
          balance={showBalance ? balances[token] : undefined}
        />
      ))}

      {/* Coming Soon Tokens */}
      <div className="px-3 py-1 mt-2 border-t border-white/5">
        <p className="text-xs text-gray-500 uppercase tracking-wider">Coming Soon (L2)</p>
      </div>
      {COMING_SOON_TOKENS.slice(0, 8).map(token => (
        <TokenOption
          key={token}
          token={token}
          isSelected={false}
          onSelect={onSelect}
          disabled
          comingSoon
        />
      ))}

      {COMING_SOON_TOKENS.length > 8 && (
        <div className="px-4 py-2 text-center">
          <span className="text-gray-500 text-sm">
            +{COMING_SOON_TOKENS.length - 8} more tokens via ZetaChain
          </span>
        </div>
      )}
    </div>
  )
}

interface TokenOptionProps {
  token: Token
  isSelected: boolean
  onSelect: (token: Token) => void
  balance?: string
  disabled?: boolean
  comingSoon?: boolean
}

const TokenOption: React.FC<TokenOptionProps> = ({
  token,
  isSelected,
  onSelect,
  balance,
  disabled,
  comingSoon,
}) => {
  const info = TOKEN_INFO[token]
  const displaySymbol = getDisplaySymbol(token)

  return (
    <button
      onClick={() => !disabled && onSelect(token)}
      disabled={disabled}
      className={classNames(
        'w-full flex items-center justify-between px-4 py-2',
        'hover:bg-white/5 transition-colors',
        isSelected && 'bg-cyan-500/10',
        disabled && 'opacity-40 cursor-not-allowed'
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-xl">{info?.icon}</span>
        <div className="text-left">
          <p className={classNames(
            'font-medium',
            isSelected ? 'text-cyan-400' : 'text-white'
          )}>
            {displaySymbol}
          </p>
          <p className="text-gray-500 text-xs">{info?.name}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {comingSoon && (
          <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
            L2
          </span>
        )}
        {balance && (
          <span className="text-gray-400 text-sm">
            {parseFloat(balance).toFixed(4)}
          </span>
        )}
        {isSelected && (
          <Check className="w-4 h-4 text-cyan-400" />
        )}
      </div>
    </button>
  )
}

export default TokenSelector
