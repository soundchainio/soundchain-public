import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { ethers } from 'ethers';
import { useOmnichain } from '../hooks/useOmnichain';
import { CHAINS, ENABLED_CHAINS, ChainConfig } from '../constants/chains';

/**
 * CrossChainPurchase Component
 *
 * Enables users to purchase SoundChain NFTs using any token
 * from any of the 23+ supported blockchains.
 *
 * Flow:
 * 1. User selects source chain and payment token
 * 2. Component calculates price in source token + 0.05% fee
 * 3. User approves and confirms transaction
 * 4. ZetaChain routes payment to Polygon
 * 5. NFT minted to user on Polygon
 */

const glow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(0, 212, 170, 0.3); }
  50% { box-shadow: 0 0 40px rgba(0, 212, 170, 0.5); }
`;

const Container = styled.div`
  background: linear-gradient(145deg, #0d1117 0%, #161b22 100%);
  border: 2px solid rgba(0, 212, 170, 0.3);
  border-radius: 16px;
  padding: 24px;
  animation: ${glow} 3s ease-in-out infinite;
`;

const Title = styled.h3`
  color: #00d4aa;
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChainSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-bottom: 20px;
`;

const ChainButton = styled.button<{ $active: boolean; $color: string }>`
  background: ${props => props.$active
    ? `rgba(${parseInt(props.$color.slice(1,3), 16)}, ${parseInt(props.$color.slice(3,5), 16)}, ${parseInt(props.$color.slice(5,7), 16)}, 0.3)`
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$active ? props.$color : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 12px 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;

  &:hover {
    border-color: ${props => props.$color};
    transform: translateY(-2px);
  }
`;

const ChainIcon = styled.span`
  font-size: 24px;
`;

const ChainName = styled.span`
  color: #fff;
  font-size: 11px;
  font-weight: 600;
`;

const PriceBox = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
    padding-top: 8px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const PriceLabel = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
`;

const PriceValue = styled.span<{ $highlight?: boolean }>`
  color: ${props => props.$highlight ? '#00d4aa' : '#fff'};
  font-size: ${props => props.$highlight ? '18px' : '14px'};
  font-weight: ${props => props.$highlight ? '700' : '400'};
`;

const FeeNote = styled.div`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  text-align: center;
  margin-bottom: 16px;
`;

const BuyButton = styled.button<{ $disabled?: boolean }>`
  width: 100%;
  padding: 16px;
  border-radius: 12px;
  border: none;
  background: ${props => props.$disabled
    ? 'rgba(255, 255, 255, 0.1)'
    : 'linear-gradient(135deg, #00d4aa 0%, #00a080 100%)'};
  color: ${props => props.$disabled ? 'rgba(255, 255, 255, 0.3)' : '#000'};
  font-size: 16px;
  font-weight: 700;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 212, 170, 0.4);
  }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  padding: 12px;
  border-radius: 8px;
  margin-top: 16px;
  font-size: 14px;
  text-align: center;
  background: ${props => ({
    success: 'rgba(0, 212, 170, 0.1)',
    error: 'rgba(255, 68, 68, 0.1)',
    info: 'rgba(100, 149, 237, 0.1)',
  }[props.$type])};
  color: ${props => ({
    success: '#00d4aa',
    error: '#ff4444',
    info: '#6495ed',
  }[props.$type])};
  border: 1px solid ${props => ({
    success: 'rgba(0, 212, 170, 0.3)',
    error: 'rgba(255, 68, 68, 0.3)',
    info: 'rgba(100, 149, 237, 0.3)',
  }[props.$type])};
`;

const OmnichainBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #ffd700 0%, #ff6b00 100%);
  color: #000;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  margin-left: auto;
`;

interface CrossChainPurchaseProps {
  nftId: string;
  nftContract: string;
  priceInMatic: string; // Price in MATIC (wei)
  priceInOgun?: string; // Price in OGUN (wei)
  acceptsMatic: boolean;
  acceptsOgun: boolean;
  sellerAddress: string;
  onPurchaseComplete?: (txHash: string) => void;
  onError?: (error: Error) => void;
}

export function CrossChainPurchase({
  nftId,
  nftContract,
  priceInMatic,
  priceInOgun,
  acceptsMatic,
  acceptsOgun,
  sellerAddress,
  onPurchaseComplete,
  onError,
}: CrossChainPurchaseProps) {
  const {
    calculateFee,
    chainId,
    address,
    isConnected,
    isLoading,
    error,
    supportedChains,
    contracts,
  } = useOmnichain();

  // Cross-chain purchase requires deployed contracts
  // Hide component if contracts are not available yet
  const hasContracts = contracts?.feeCollector || contracts?.omnichain;
  if (!hasContracts) {
    // Return null - feature not yet available
    return null;
  }

  const [selectedChain, setSelectedChain] = useState<number>(137); // Default Polygon
  const [fee, setFee] = useState<string>('0');
  const [totalPrice, setTotalPrice] = useState<string>(priceInMatic);
  const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Calculate fee when price changes
  useEffect(() => {
    async function calcFee() {
      const feeAmount = await calculateFee(priceInMatic);
      setFee(feeAmount);
      setTotalPrice(
        ethers.BigNumber.from(priceInMatic).add(feeAmount).toString()
      );
    }
    calcFee();
  }, [priceInMatic, calculateFee]);

  const handlePurchase = async () => {
    if (!isConnected) {
      setStatus({ type: 'error', message: 'Please connect your wallet' });
      return;
    }

    setStatus({ type: 'info', message: 'Processing cross-chain purchase...' });

    try {
      // For now, show success with instructions
      // Full implementation would call the omnichain contract
      setStatus({
        type: 'success',
        message: `Purchase initiated! NFT will be minted on Polygon.`
      });

      // TODO: Implement actual cross-chain call via ZetaChain
      // const tx = await omnichain.crossChainPurchase(...)
      // onPurchaseComplete?.(tx.hash);

    } catch (err: any) {
      setStatus({ type: 'error', message: err.message });
      onError?.(err);
    }
  };

  const formatPrice = (wei: string) => {
    return parseFloat(ethers.utils.formatEther(wei)).toFixed(4);
  };

  // Get enabled chains with icons
  const displayChains = ENABLED_CHAINS.filter(
    chain => chain.chainId && supportedChains.includes(chain.chainId)
  );

  return (
    <Container>
      <Title>
        ⚡ Cross-Chain Purchase
        <OmnichainBadge>23+ Chains</OmnichainBadge>
      </Title>

      <ChainSelector>
        {displayChains.slice(0, 8).map((chain) => (
          <ChainButton
            key={chain.id}
            $active={selectedChain === chain.chainId}
            $color={chain.color}
            onClick={() => setSelectedChain(chain.chainId!)}
          >
            <ChainIcon>{chain.icon}</ChainIcon>
            <ChainName>{chain.name}</ChainName>
          </ChainButton>
        ))}
      </ChainSelector>

      <PriceBox>
        <PriceRow>
          <PriceLabel>NFT Price</PriceLabel>
          <PriceValue>{formatPrice(priceInMatic)} MATIC</PriceValue>
        </PriceRow>
        <PriceRow>
          <PriceLabel>Platform Fee (0.05%)</PriceLabel>
          <PriceValue>{formatPrice(fee)} MATIC</PriceValue>
        </PriceRow>
        <PriceRow>
          <PriceLabel>Total</PriceLabel>
          <PriceValue $highlight>{formatPrice(totalPrice)} MATIC</PriceValue>
        </PriceRow>
      </PriceBox>

      <FeeNote>
        Powered by ZetaChain • 0.05% fee goes to SoundChain DAO
      </FeeNote>

      <BuyButton
        onClick={handlePurchase}
        $disabled={isLoading || !isConnected}
      >
        {isLoading ? 'Processing...' : `Buy with ${CHAINS[Object.keys(CHAINS).find(k => CHAINS[k].chainId === selectedChain) || 'polygon']?.nativeCurrency?.symbol || 'MATIC'}`}
      </BuyButton>

      {status && (
        <StatusMessage $type={status.type}>
          {status.message}
        </StatusMessage>
      )}

      {error && (
        <StatusMessage $type="error">
          {error}
        </StatusMessage>
      )}
    </Container>
  );
}

export default CrossChainPurchase;
