
import React, { useState, useEffect } from 'react';
import { FlashcardDeck } from '../../types';
import Icon from '../Icon';

interface FlashcardReviewModalProps {
  deck: FlashcardDeck;
  onClose: () => void;
}

const FlashcardReviewModal: React.FC<FlashcardReviewModalProps> = ({ deck, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const [shuffledCards, setShuffledCards] = useState([...deck.cards]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    // Shuffle cards on component mount
    setShuffledCards(prev => [...prev].sort(() => Math.random() - 0.5));
  }, [deck]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev + 1) % shuffledCards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex(prev => (prev - 1 + shuffledCards.length) % shuffledCards.length);
  };

  const currentCard = shuffledCards[currentIndex];
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  if (!currentCard) {
      return (
        <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
            <div className={`w-full max-w-2xl bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
                <p className="text-center text-gray-400">This deck has no cards to review.</p>
                <button onClick={handleClose} className="mt-4 w-full px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Close</button>
            </div>
        </div>
      )
  }

  return (
    <div className={`fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-2xl bg-transparent ${contentAnimationClasses} flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <header className="flex-shrink-0 mb-4 flex justify-between items-center text-white">
            <div>
                <h2 className="text-2xl font-bold">{deck.name}</h2>
                <p className="text-sm text-gray-400">Card {currentIndex + 1} of {shuffledCards.length}</p>
            </div>
            <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 text-gray-300">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </header>

        <div 
            className="flex-grow perspective-1000 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
        >
            <div className={`relative w-full h-full min-h-[300px] transition-transform duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                {/* Front */}
                <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl">
                    <p className="text-2xl text-white text-center">{currentCard.front}</p>
                </div>
                {/* Back */}
                <div className="absolute w-full h-full backface-hidden flex items-center justify-center p-6 bg-gray-800/80 border border-[var(--glass-border)] rounded-xl transform rotate-y-180">
                     <p className="text-xl text-gray-300 text-center">{currentCard.back}</p>
                </div>
            </div>
        </div>
        
        <footer className="flex-shrink-0 flex justify-center items-center gap-4 pt-4 mt-4">
            <button onClick={handlePrev} className="px-6 py-3 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Previous</button>
            <button onClick={() => setIsFlipped(!isFlipped)} className="px-8 py-4 text-base font-bold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white">
                {isFlipped ? 'Show Question' : 'Flip Card'}
            </button>
            <button onClick={handleNext} className="px-6 py-3 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600">Next</button>
        </footer>
      </div>
      <style>{`
        .perspective-1000 { perspective: 1000px; }
        .transform-style-preserve-3d { transform-style: preserve-3d; }
        .rotate-y-180 { transform: rotateY(180deg); }
        .backface-hidden { backface-visibility: hidden; }
      `}</style>
    </div>
  );
};

export default FlashcardReviewModal;
