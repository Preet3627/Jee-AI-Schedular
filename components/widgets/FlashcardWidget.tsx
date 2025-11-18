import React from 'react';
import { FlashcardDeck } from '../../types';
import Icon from '../Icon';

interface FlashcardWidgetProps {
  decks: FlashcardDeck[];
  onStartReview: (deckId: string) => void;
}

const FlashcardWidget: React.FC<FlashcardWidgetProps> = ({ decks, onStartReview }) => {
  // Show the 3 most recently created/modified decks
  const recentDecks = [...decks].slice(-3).reverse();

  if (decks.length === 0) {
    return null; // Don't render the widget if there are no decks
  }

  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <h2 className="text-xl font-semibold text-[var(--accent-color)] tracking-widest uppercase mb-4">
        Flashcard Decks
      </h2>
      <div className="space-y-3">
        {recentDecks.map(deck => (
          <div key={deck.id} className="bg-gray-900/70 p-3 rounded-lg flex items-center justify-between gap-2">
            <div>
              <p className="font-bold text-white text-sm">{deck.name}</p>
              <p className="text-xs text-gray-400">{deck.subject} - {deck.cards.length} cards</p>
            </div>
            <button
              onClick={() => onStartReview(deck.id)}
              disabled={deck.cards.length === 0}
              title="Start Review Session"
              className="p-2 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon name="play" className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlashcardWidget;
