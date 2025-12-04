import React, { useState } from 'react';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
  listView?: boolean;
}

export const FlipCard: React.FC<FlipCardProps> = ({ 
  front, 
  back, 
  className = '',
  listView = false 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  if (listView) {
    // For list view, just show front without flip animation
    return <div className={className}>{front}</div>;
  }

  return (
    <div 
      className={`flip-card-container ${className}`}
      onClick={handleFlip}
    >
      <div className={`flip-card ${isFlipped ? 'flipped' : ''}`}>
        <div className="flip-card-front">
          {front}
        </div>
        <div className="flip-card-back">
          {back}
        </div>
      </div>
    </div>
  );
};