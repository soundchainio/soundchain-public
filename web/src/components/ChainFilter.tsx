import { useState, useMemo } from 'react';
import { CHAINS, ChainConfig, getChainsByCategory } from '../constants/chains';
import styled from 'styled-components';

const FilterContainer = styled.div`
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.1);
  border: 2px solid rgba(255, 215, 0, 0.3);
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 200%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 215, 0, 0.05),
      transparent
    );
    animation: shimmer 3s infinite;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }
`;

const FilterHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  cursor: pointer;
  user-select: none;

  &:hover {
    opacity: 0.8;
  }
`;

const FilterTitle = styled.h3`
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ExpandIcon = styled.span<{ $expanded: boolean }>`
  color: #00d4aa;
  font-size: 20px;
  transform: ${props => props.$expanded ? 'rotate(180deg)' : 'rotate(0deg)'};
  transition: transform 0.3s ease;
`;

const SearchBox = styled.input`
  width: 100%;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  margin-bottom: 16px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: #00d4aa;
    background: rgba(255, 255, 255, 0.08);
    box-shadow: 0 0 15px rgba(0, 212, 170, 0.2);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
`;

const ChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  margin-top: 16px;
`;

const ChainButton = styled.button<{ $active: boolean; $color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: ${props => props.$active
    ? `linear-gradient(135deg, ${props.$color}40, ${props.$color}20)`
    : 'rgba(255, 255, 255, 0.03)'};
  border: 2px solid ${props => props.$active ? props.$color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, ${props => props.$color}30, transparent);
    transition: left 0.5s ease;
  }

  &:hover:before {
    left: 100%;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px ${props => props.$color}40;
    border-color: ${props => props.$color};
  }

  &:active {
    transform: translateY(0);
  }
`;

const ChainIcon = styled.span`
  font-size: 20px;
  line-height: 1;
`;

const ChainName = styled.span`
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CategorySection = styled.div`
  margin-bottom: 24px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CategoryTitle = styled.h4`
  color: #00d4aa;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 212, 170, 0.2);
`;

const SelectedCount = styled.div`
  display: inline-block;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
`;

const ClearButton = styled.button`
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  color: #ff4444;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 0, 0, 0.2);
    border-color: #ff4444;
    transform: scale(1.05);
  }
`;

interface ChainFilterProps {
  selectedChains: string[];
  onChainToggle: (chainId: string) => void;
  onClearAll: () => void;
}

export function ChainFilter({ selectedChains, onChainToggle, onClearAll }: ChainFilterProps) {
  const [expanded, setExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChainsByCategory = useMemo(() => {
    const categories: Array<{ title: string; key: ChainConfig['category'] }> = [
      { title: 'Omnichain', key: 'omnichain' },
      { title: 'Layer 1', key: 'layer1' },
      { title: 'Layer 2', key: 'layer2' },
      { title: 'Specialized', key: 'specialized' },
    ];

    return categories.map(({ title, key }) => ({
      title,
      chains: getChainsByCategory(key).filter(chain =>
        chain.displayName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    })).filter(category => category.chains.length > 0);
  }, [searchQuery]);

  const allChainIds = useMemo(() =>
    Object.keys(CHAINS),
    []
  );

  const handleSelectAll = () => {
    allChainIds.forEach(id => {
      if (!selectedChains.includes(id)) {
        onChainToggle(id);
      }
    });
  };

  return (
    <FilterContainer>
      <FilterHeader onClick={() => setExpanded(!expanded)}>
        <FilterTitle>
          <span>⛓️</span>
          Chains
          {selectedChains.length > 0 && (
            <SelectedCount>{selectedChains.length}</SelectedCount>
          )}
        </FilterTitle>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {selectedChains.length > 0 && (
            <ClearButton onClick={(e) => { e.stopPropagation(); onClearAll(); }}>
              Clear All
            </ClearButton>
          )}
          <ExpandIcon $expanded={expanded}>▼</ExpandIcon>
        </div>
      </FilterHeader>

      {expanded && (
        <>
          <SearchBox
            type="text"
            placeholder="🔍 Search chains..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />

          <div style={{ marginBottom: '16px', display: 'flex', gap: '8px' }}>
            <button
              onClick={handleSelectAll}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
                border: 'none',
                borderRadius: '6px',
                color: '#000',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 15px rgba(255, 215, 0, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 215, 0, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(255, 215, 0, 0.3)';
              }}
            >
              ⭐ Select All
            </button>
          </div>

          {filteredChainsByCategory.map(({ title, chains }) => (
            <CategorySection key={title}>
              <CategoryTitle>{title}</CategoryTitle>
              <ChainGrid>
                {chains.map((chain) => (
                  <ChainButton
                    key={chain.id}
                    $active={selectedChains.includes(chain.id)}
                    $color={chain.color}
                    onClick={() => onChainToggle(chain.id)}
                  >
                    <ChainIcon>{chain.icon}</ChainIcon>
                    <ChainName>{chain.displayName}</ChainName>
                  </ChainButton>
                ))}
              </ChainGrid>
            </CategorySection>
          ))}
        </>
      )}
    </FilterContainer>
  );
}
