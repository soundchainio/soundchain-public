import { useMemo } from 'react';
import styled, { keyframes } from 'styled-components';

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.05);
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

const DashboardContainer = styled.div`
  background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
  border-radius: 20px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
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
      rgba(255, 215, 0, 0.1),
      transparent
    );
    animation: ${shimmer} 3s infinite;
  }
`;

const DashboardTitle = styled.h2`
  color: #ffd700;
  font-size: 28px;
  font-weight: 800;
  margin: 0 0 24px 0;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  animation: ${pulse} 2s ease-in-out infinite;

  @media (max-width: 768px) {
    font-size: 22px;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div<{ $color: string }>`
  background: linear-gradient(135deg, ${props => props.$color}20, ${props => props.$color}10);
  border: 2px solid ${props => props.$color};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;

  &:hover {
    transform: translateY(-4px) scale(1.02);
    box-shadow: 0 8px 30px ${props => props.$color}60;
    border-color: ${props => props.$color};
  }

  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: ${props => props.$color};
    transform: scaleX(0);
    transition: transform 0.3s ease;
  }

  &:hover:before {
    transform: scaleX(1);
  }
`;

const StatLabel = styled.div`
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
`;

const StatValue = styled.div`
  color: #fff;
  font-size: 32px;
  font-weight: 800;
  line-height: 1;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const StatSubtext = styled.div`
  color: rgba(255, 255, 255, 0.5);
  font-size: 10px;
  margin-top: 4px;
`;

const ActivityFeed = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 200px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ffd700;
    border-radius: 3px;
  }
`;

const ActivityTitle = styled.h3`
  color: #ffd700;
  font-size: 16px;
  font-weight: 700;
  margin: 0 0 12px 0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const ActivityItem = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    color: #ffd700;
    padding-left: 8px;
  }
`;

const ActivityTime = styled.span`
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
`;

interface MarketplaceDashboardProps {
  totalTracks?: number;
  totalBundles?: number;
  totalSweeps?: number;
  totalAuctions?: number;
  totalTokens?: number;
  totalPrivate?: number;
  totalArt?: number;
  totalFilm?: number;
  totalTickets?: number;
}

export function MarketplaceDashboard({
  totalTracks = 0,
  totalBundles = 0,
  totalSweeps = 0,
  totalAuctions = 0,
  totalTokens = 0,
  totalPrivate = 0,
  totalArt = 0,
  totalFilm = 0,
  totalTickets = 0,
}: MarketplaceDashboardProps) {

  const totalListings = useMemo(() =>
    totalTracks + totalBundles + totalSweeps + totalAuctions +
    totalTokens + totalPrivate + totalArt + totalFilm + totalTickets,
    [totalTracks, totalBundles, totalSweeps, totalAuctions, totalTokens, totalPrivate, totalArt, totalFilm, totalTickets]
  );

  const mockActivity = [
    { action: 'Bundle purchased', item: '3 Music NFTs', time: '2m ago', type: 'sale' },
    { action: 'Auction started', item: 'Rare Album', time: '5m ago', type: 'auction' },
    { action: 'Sweep completed', item: '10 Tracks', time: '8m ago', type: 'sweep' },
    { action: 'Private listing', item: 'Concert Ticket', time: '12m ago', type: 'private' },
    { action: 'Token minted', item: 'New Release', time: '15m ago', type: 'mint' },
  ];

  return (
    <DashboardContainer>
      <DashboardTitle>⭐️ LIVE MARKETPLACE ⭐️</DashboardTitle>

      <StatsGrid>
        <StatCard $color="#ffd700">
          <StatLabel>Total Listings</StatLabel>
          <StatValue>{totalListings.toLocaleString()}</StatValue>
          <StatSubtext>Across all types</StatSubtext>
        </StatCard>

        <StatCard $color="#00d4aa">
          <StatLabel>Tracks</StatLabel>
          <StatValue>{totalTracks.toLocaleString()}</StatValue>
          <StatSubtext>Music NFTs</StatSubtext>
        </StatCard>

        <StatCard $color="#ff6b6b">
          <StatLabel>Bundles</StatLabel>
          <StatValue>{totalBundles.toLocaleString()}</StatValue>
          <StatSubtext>Multi-asset packs</StatSubtext>
        </StatCard>

        <StatCard $color="#4ecdc4">
          <StatLabel>Sweeps</StatLabel>
          <StatValue>{totalSweeps.toLocaleString()}</StatValue>
          <StatSubtext>Bulk purchases</StatSubtext>
        </StatCard>

        <StatCard $color="#ff9ff3">
          <StatLabel>Auctions</StatLabel>
          <StatValue>{totalAuctions.toLocaleString()}</StatValue>
          <StatSubtext>Live bidding</StatSubtext>
        </StatCard>

        <StatCard $color="#feca57">
          <StatLabel>Tokens</StatLabel>
          <StatValue>{totalTokens.toLocaleString()}</StatValue>
          <StatSubtext>Digital assets</StatSubtext>
        </StatCard>

        <StatCard $color="#a29bfe">
          <StatLabel>Private</StatLabel>
          <StatValue>{totalPrivate.toLocaleString()}</StatValue>
          <StatSubtext>Exclusive deals</StatSubtext>
        </StatCard>

        <StatCard $color="#fd79a8">
          <StatLabel>Art</StatLabel>
          <StatValue>{totalArt.toLocaleString()}</StatValue>
          <StatSubtext>Visual works</StatSubtext>
        </StatCard>

        <StatCard $color="#74b9ff">
          <StatLabel>Film</StatLabel>
          <StatValue>{totalFilm.toLocaleString()}</StatValue>
          <StatSubtext>Video content</StatSubtext>
        </StatCard>

        <StatCard $color="#55efc4">
          <StatLabel>Tickets</StatLabel>
          <StatValue>{totalTickets.toLocaleString()}</StatValue>
          <StatSubtext>Event access</StatSubtext>
        </StatCard>
      </StatsGrid>

      <ActivityFeed>
        <ActivityTitle>🔥 Recent Activity</ActivityTitle>
        {mockActivity.map((item, index) => (
          <ActivityItem key={index}>
            <span>
              <strong>{item.action}:</strong> {item.item}
            </span>
            <ActivityTime>{item.time}</ActivityTime>
          </ActivityItem>
        ))}
      </ActivityFeed>
    </DashboardContainer>
  );
}
