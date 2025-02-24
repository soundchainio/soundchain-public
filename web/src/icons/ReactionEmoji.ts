import React, { useState } from 'react';
import Picker from '@emoji-mart/react';
import { Emoji } from '@emoji-mart/react';

interface ReactionEmojiProps {
  name?: string; // Default emoji name if one is passed
  size?: number;
  onSelect?: (emoji: string) => void; // Callback for emoji selection
}

export const ReactionEmoji: React.FC<ReactionEmojiProps> = ({ name = 'smile', size = 24, onSelect }) => {
  const [selectedEmoji, setSelectedEmoji] = useState(name);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const handleEmojiSelect = (emoji: any) => {
    setSelectedEmoji(emoji.id); // Update the selected emoji
    setIsPickerOpen(false); // Close the picker
    if (onSelect) onSelect(emoji.id); // Callback to parent component
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Display Selected Emoji */}
      <span onClick={() => setIsPickerOpen(!isPickerOpen)} style={{ cursor: 'pointer' }}>
        <Emoji id={selectedEmoji} size={size} set="apple" />
      </span>

      {/* Emoji Picker (Shown when clicked) */}
      {isPickerOpen && (
        <div style={{ position: 'absolute', zIndex: 1000 }}>
          <Picker onEmojiSelect={handleEmojiSelect} set="apple" />
        </div>
      )}
    </div>
  );
};
