import { useState, useMemo } from 'react';
import styled, { keyframes } from 'styled-components';
import { ENABLED_CHAINS, getChainsByCategory, ChainConfig } from '../constants/chains';

const glow = keyframes`
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2);
  }
  50% {
    box-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 60px rgba(255, 215, 0, 0.3);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -1000px 0;
  }
  100% {
    background-position: 1000px 0;
  }
`;

const BillboardContainer = styled.div`
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 32px;
  margin-bottom: 32px;
  border: 3px solid rgba(255, 215, 0, 0.5);
  position: relative;
  overflow: hidden;
  animation: ${glow} 3s ease-in-out infinite;

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
      rgba(255, 215, 0, 0.1),
      transparent
    );
    animation: ${shimmer} 3s infinite;
  }
`;

const Title = styled.h1`
  color: #ffd700;
  font-size: 36px;
  font-weight: 900;
  margin: 0 0 12px 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 3px;
  text-shadow: 0 0 30px rgba(255, 215, 0, 0.6), 0 0 10px rgba(255, 215, 0, 0.8);
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 24px;
    letter-spacing: 2px;
  }
`;

const Subtitle = styled.p`
  color: #00d4aa;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
  margin: 0 0 32px 0;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const ChainCount = styled.div`
  display: inline-block;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 24px;
  font-weight: 900;
  margin: 0 8px;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);

  @media (max-width: 768px) {
    font-size: 18px;
    padding: 6px 16px;
  }
`;

const ChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin: 24px 0;
  position: relative;
  z-index: 1;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;

const ChainCard = styled.button<{ $active: boolean; $color: string }>`
  background: ${props => props.$active
    ? `rgba(${parseInt(props.$color.slice(1,3), 16)}, ${parseInt(props.$color.slice(3,5), 16)}, ${parseInt(props.$color.slice(5,7), 16)}, 0.25)`
    : 'rgba(255, 255, 255, 0.08)'};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 3px solid ${props => props.$active ? props.$color : 'rgba(255, 255, 255, 0.15)'};
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  &:hover {
    transform: translateY(-8px) scale(1.05);
    box-shadow: 0 12px 40px ${props => props.$color}60;
    border-color: ${props => props.$color};
    background: ${props => `rgba(${parseInt(props.$color.slice(1,3), 16)}, ${parseInt(props.$color.slice(3,5), 16)}, ${parseInt(props.$color.slice(5,7), 16)}, 0.35)`};
  }

  &:active {
    transform: translateY(-4px) scale(1.02);
  }
`;

const ChainIcon = styled.div`
  font-size: 48px;
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));

  @media (max-width: 768px) {
    font-size: 36px;
  }
`;

const ChainName = styled.div`
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const ChainSymbol = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const CategorySection = styled.div`
  margin-bottom: 32px;

  &:last-child {
    margin-bottom: 0;
  }
`;

const CategoryHeader = styled.div`
  background: rgba(0, 212, 170, 0.15);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-left: 4px solid #00d4aa;
  padding: 12px 20px;
  margin-bottom: 16px;
  border-radius: 8px;
`;

const CategoryTitle = styled.h3`
  color: #00d4aa;
  font-size: 20px;
  font-weight: 800;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 2px;

  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

const ControlBar = styled.div`
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  margin: 24px 0;
  position: relative;
  z-index: 1;
`;

const ControlButton = styled.button<{ $variant?: 'primary' | 'clear' }>`
  padding: 12px 32px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 2px solid;

  ${props => props.$variant === 'clear' ? `
    background: rgba(255, 68, 68, 0.1);
    border-color: rgba(255, 68, 68, 0.5);
    color: #ff4444;

    &:hover {
      background: rgba(255, 68, 68, 0.2);
      border-color: #ff4444;
      transform: scale(1.05);
      box-shadow: 0 0 20px rgba(255, 68, 68, 0.3);
    }
  ` : `
    background: linear-gradient(135deg, #ffd700, #ffed4e);
    border-color: #ffd700;
    color: #000;
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);

    &:hover {
      transform: scale(1.05);
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.6);
    }
  `}

  &:active {
    transform: scale(0.98);
  }
`;

const SelectedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #ffd700, #ffed4e);
  color: #000;
  padding: 8px 20px;
  border-radius: 16px;
  font-size: 16px;
  font-weight: 800;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
`;

interface OmnichainBillboardProps {
  selectedChains: string[];
  onChainToggle: (chainId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}

export function OmnichainBillboard({
  selectedChains,
  onChainToggle,
  onSelectAll,
  onClearAll,
}: OmnichainBillboardProps) {
  const categories = [
    { title: 'Omnichain', key: 'omnichain' as const },
    { title: 'Layer 1 Blockchains', key: 'layer1' as const },
    { title: 'Layer 2 Solutions', key: 'layer2' as const },
    { title: 'Specialized Networks', key: 'specialized' as const },
  ];

  return (
    <BillboardContainer>
      <Title>
        ⚡ OMNICHAIN MARKETPLACE ⚡
      </Title>
      <Subtitle>
        First True Web3 Publishing House Supporting
        <ChainCount>{ENABLED_CHAINS.length}</ChainCount>
        Blockchains
      </Subtitle>

      <ControlBar>
        <ControlButton onClick={onSelectAll}>
          ⭐ Select All Chains
        </ControlButton>
        {selectedChains.length > 0 && (
          <>
            <SelectedBadge>
              ✓ {selectedChains.length} Selected
            </SelectedBadge>
            <ControlButton $variant="clear" onClick={onClearAll}>
              Clear All
            </ControlButton>
          </>
        )}
      </ControlBar>

      {categories.map(({ title, key }) => {
        const chains = getChainsByCategory(key);
        if (chains.length === 0) return null;

        return (
          <CategorySection key={key}>
            <CategoryHeader>
              <CategoryTitle>{title}</CategoryTitle>
            </CategoryHeader>
            <ChainGrid>
              {chains.map((chain) => (
                <ChainCard
                  key={chain.id}
                  $active={selectedChains.includes(chain.id)}
                  $color={chain.color}
                  onClick={() => onChainToggle(chain.id)}
                >
                  <ChainIcon>{chain.icon}</ChainIcon>
                  <ChainName>{chain.displayName}</ChainName>
                  <ChainSymbol>{chain.nativeCurrency?.symbol || ''}</ChainSymbol>
                </ChainCard>
              ))}
            </ChainGrid>
          </CategorySection>
        );
      })}
    </BillboardContainer>
  );
}
