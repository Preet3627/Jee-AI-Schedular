import React from 'react';
import { FlashcardDeck } from '../../types';
import Icon from '../Icon';

interface FlashcardManagerProps {
  decks: FlashcardDeck[];
  onAddDeck: () => void;
  onEditDeck: (deck: FlashcardDeck) => void;
  onDeleteDeck: (deckId: string) => void;
  onViewDeck: (deck: FlashcardDeck) => void;
  onStartReview: (deckId: string) => void;
  onGenerateWithAI: () => void;
}

const FlashcardManager: React.FC<FlashcardManagerProps> = ({ decks, onAddDeck, onEditDeck, onDeleteDeck, onViewDeck, onStartReview, onGenerateWithAI }) => {
  return (
    <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-white">My Flashcard Decks</h2>
        <div className="flex items-center gap-2">
          <button onClick={onGenerateWithAI} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gray-700/80 hover:bg-gray-700">
            <Icon name="gemini" /> Generate with AI
          </button>
          <button onClick={onAddDeck} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
            <Icon name="plus" /> New Deck
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.length > 0 ? (
          decks.map(deck => (
            <div key={deck.id} className="bg-gray-800/50 rounded-lg border border-gray-700 p-4 flex flex-col justify-between group">
              <div>
                <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-white">{deck.name}</h3>
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => onEditDeck(deck)} className="p-1 text-gray-400 hover:text-white"><Icon name="edit" className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteDeck(deck.id)} className="p-1 text-gray-400 hover:text-red-400"><Icon name="trash" className="w-4 h-4" /></button>
                    </div>
                </div>
                <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">{deck.subject}</p>
                <p className="text-sm text-gray-400 mt-2">{deck.cards.length} card(s)</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => onViewDeck(deck)} className="flex-1 text-center px-3 py-2 text-xs font-semibold rounded-md bg-gray-700 hover:bg-gray-600">Manage</button>
                <button onClick={() => onStartReview(deck.id)} disabled={deck.cards.length === 0} className="flex-1 text-center px-3 py-2 text-xs font-semibold rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed">Review</button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center text-gray-500 py-12 border-2 border-dashed border-gray-700 rounded-lg">
            <Icon name="cards" className="w-12 h-12 mx-auto text-gray-600" />
            <p className="mt-4 font-semibold">No flashcard decks found.</p>
            <p className="text-sm">Click "New Deck" to create your first one, or use the AI generator.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashcardManager;