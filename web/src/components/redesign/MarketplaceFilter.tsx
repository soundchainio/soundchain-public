import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Search, Filter, X } from 'lucide-react';

interface MarketplaceFilterProps {
  cryptoCurrencies: string[];
  selectedCurrencies: string[];
  setSelectedCurrencies: (currencies: string[]) => void;
  selectedChainId: number | undefined;
  setSelectedChainId: (chainId: number | undefined) => void;
  saleTypeFilter: string;
  setSaleTypeFilter: (saleType: string) => void;
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  sortBy: string;
  setSortBy: (sortBy: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  privateAssetOptions: string[];
}

const chainOptions = [
  { id: 1, name: 'Ethereum' },
  { id: 137, name: 'Polygon' },
  { id: 56, name: 'BSC' },
  { id: 101, name: 'Solana' },
  { id: 250, name: 'Fantom' },
  { id: 43114, name: 'Avalanche' },
  { id: 7000, name: 'Zetachain' },
  { id: 8455, name: 'Base' },
  { id: 1284, name: 'Moonbeam' },
  { id: 25, name: 'Cronos' },
  { id: 100, name: 'Gnosis' },
  { id: 128, name: 'Heco' },
  { id: 1442, name: 'Polygon zkEVM' },
  { id: 784, name: 'Sui' },
  { id: 415, name: 'Hedera' },
  { id: 60, name: 'GoChain' },
  { id: 2, name: 'Litecoin' },
  { id: 1839, name: 'Bitcoin' }
];

export const MarketplaceFilter: React.FC<MarketplaceFilterProps> = ({
  cryptoCurrencies,
  selectedCurrencies,
  setSelectedCurrencies,
  selectedChainId,
  setSelectedChainId,
  saleTypeFilter,
  setSaleTypeFilter,
  priceRange,
  setPriceRange,
  sortBy,
  setSortBy,
  searchQuery,
  setSearchQuery,
  privateAssetOptions
}) => {
  const handleCurrencyToggle = (currency: string) => {
    setSelectedCurrencies(
      selectedCurrencies.includes(currency)
        ? selectedCurrencies.filter(c => c !== currency)
        : [...selectedCurrencies, currency]
    );
  };

  const clearAllFilters = () => {
    setSelectedCurrencies([]);
    setSelectedChainId(undefined);
    setSaleTypeFilter('all');
    setPriceRange([0, 10000]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCurrencies.length > 0 || selectedChainId || saleTypeFilter !== 'all' || priceRange[0] > 0 || priceRange[1] < 10000 || searchQuery;

  return (
    <div className="space-y-6">
      {/* Search */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json flex items-center space-x-2">
            <Search className="w-5 h-5" />
            <span>"search_query":</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="{ token_id, isrc, asset_type }"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 analog-glow bg-gray-900 border-cyan-400/30 text-cyan-100 placeholder-cyan-400/60 retro-text"
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Filters */}
      {hasActiveFilters && (
        <Card className="retro-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="retro-json flex items-center space-x-2">
                <Filter className="w-5 h-5" />
                <span>"active_filters":</span>
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="retro-button text-cyan-400 hover:bg-cyan-400 hover:text-black"
              >
                <X className="w-4 h-4 mr-1" />
                CLEAR
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedCurrencies.map((currency) => (
                <div
                  key={currency}
                  className="flex items-center space-x-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-sm"
                >
                  <span>{currency}</span>
                  <button
                    onClick={() => handleCurrencyToggle(currency)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedChainId && (
                <div className="flex items-center space-x-1 bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-sm">
                  <span>{chainOptions.find(c => c.id === selectedChainId)?.name}</span>
                  <button
                    onClick={() => setSelectedChainId(undefined)}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
              {saleTypeFilter !== 'all' && (
                <div className="flex items-center space-x-1 bg-green-500/20 text-green-400 px-2 py-1 rounded text-sm">
                  <span className="capitalize">{saleTypeFilter}</span>
                  <button
                    onClick={() => setSaleTypeFilter('all')}
                    className="text-green-400 hover:text-green-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sort */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json">"sort_order":</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="analog-glow bg-gray-900 border-cyan-400/30 text-cyan-100 retro-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-400/30 retro-card">
              <SelectItem value="price-low" className="retro-text text-cyan-100">PRICE: LOW → HIGH</SelectItem>
              <SelectItem value="price-high" className="retro-text text-cyan-100">PRICE: HIGH → LOW</SelectItem>
              <SelectItem value="name" className="retro-text text-cyan-100">NAME: A → Z</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Price Range */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json">"price_range_usd":</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Slider
              value={priceRange}
              onValueChange={(value) => setPriceRange(value as [number, number])}
              max={10000}
              min={0}
              step={10}
              className="w-full"
            />
            <div className="flex items-center space-x-2">
              <div className="mpc60-display text-xs flex-1 text-center">
                ${priceRange[0]}
              </div>
              <span className="retro-text text-cyan-400">→</span>
              <div className="mpc60-display text-xs flex-1 text-center">
                ${priceRange[1]}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sale Type */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json">"sale_type":</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={saleTypeFilter} onValueChange={setSaleTypeFilter}>
            <SelectTrigger className="analog-glow bg-gray-900 border-cyan-400/30 text-cyan-100 retro-text">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-400/30 retro-card">
              <SelectItem value="all" className="retro-text text-cyan-100">ALL_TYPES</SelectItem>
              <SelectItem value="fixed" className="retro-text text-cyan-100">FIXED_PRICE</SelectItem>
              <SelectItem value="auction" className="retro-text text-cyan-100">AUCTION</SelectItem>
              <SelectItem value="bundle" className="retro-text text-cyan-100">BUNDLE</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Blockchain */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json">"blockchain":</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedChainId?.toString() || 'all'} onValueChange={(value) => setSelectedChainId(value === 'all' ? undefined : parseInt(value))}>
            <SelectTrigger className="analog-glow bg-gray-900 border-cyan-400/30 text-cyan-100 retro-text">
              <SelectValue placeholder="ALL_CHAINS" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-cyan-400/30 retro-card">
              <SelectItem value="all" className="retro-text text-cyan-100">ALL_CHAINS</SelectItem>
              {chainOptions.map((chain) => (
                <SelectItem key={chain.id} value={chain.id.toString()} className="retro-text text-cyan-100">
                  {chain.name.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Accepted Currencies */}
      <Card className="retro-card">
        <CardHeader className="pb-3">
          <CardTitle className="retro-json">"accepted_currencies":</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
            {cryptoCurrencies.map((currency) => (
              <div key={currency} className="flex items-center space-x-2">
                <Checkbox
                  id={currency}
                  checked={selectedCurrencies.includes(currency)}
                  onCheckedChange={() => handleCurrencyToggle(currency)}
                  className="border-cyan-400/50 data-[state=checked]:bg-cyan-400 data-[state=checked]:border-cyan-400"
                />
                <Label
                  htmlFor={currency}
                  className="retro-text text-sm text-cyan-300 cursor-pointer hover:text-cyan-100"
                >
                  {currency}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};