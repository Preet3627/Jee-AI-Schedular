

import React, { useState, useEffect, useRef } from 'react';
import { ScheduleItem, HomeworkData, ScheduleCardData } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Icon from './Icon';

interface ScheduleCardProps {
  cardData: ScheduleItem;
  onDelete: (id: string) => void;
  onEdit: (item: ScheduleItem) => void;
  onMoveToNextDay: (id: string) => void;
  onStar: (id: string) => void;
  onStartPractice: (homework: HomeworkData) => void;
  onStartReviewSession: (deckId: string) => void;
  onMarkDoubt?: (topic: string, q_id: string) => void;
  isSubscribed: boolean;
  isPast: boolean;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ cardData, onDelete, onEdit, onMoveToNextDay, onStar, onStartPractice, onStartReviewSession, onMarkDoubt, isSubscribed, isPast }) => {
    const { t } = useLocalization();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isManageable = cardData.type === 'ACTION' || cardData.type === 'HOMEWORK';
    const { CARD_TITLE, SUBJECT_TAG, FOCUS_DETAIL, type, isStarred } = cardData;

    const canCopyCommand = cardData.type === 'ACTION' && 'ACTION_COMMAND' in cardData && !!cardData.ACTION_COMMAND;
    const canStartPractice = cardData.type === 'HOMEWORK';
    const isFlashcardReview = cardData.type === 'ACTION' && cardData.SUB_TYPE === 'FLASHCARD_REVIEW' && !!cardData.deckId;
    
    const showActionsFooter = canCopyCommand || canStartPractice || isFlashcardReview;
    const isSynced = 'googleEventId' in cardData && !!cardData.googleEventId;


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleCopy = (text?: string) => {
      if (!text) return;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

  return (
    <div className={`bg-gray-800/50 rounded-lg border border-gray-700/80 p-5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 relative backdrop-blur-sm group ${isPast ? 'opacity-60' : ''}`}>
      
      {isSynced && (
        <div className="absolute top-3 left-3" title="Synced with Google Calendar">
          <Icon name="calendar" className="w-4 h-4 text-green-400" />
        </div>
      )}

      {isManageable && (
          <div className="absolute top-3 right-3 flex items-center gap-1">
              <button onClick={() => onStar(cardData.ID)} title="Add to Today's Focus" className="text-gray-400 hover:text-yellow-400 p-1.5 rounded-full bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Icon name="star" className={`w-5 h-5 ${isStarred ? 'text-yellow-400 fill-current' : ''}`} />
              </button>
              <div ref={menuRef}>
                  <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-gray-400 hover:text-white p-1.5 rounded-full bg-gray-900/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Icon name="ellipsis" className="w-5 h-5" />
                  </button>
                  {isMenuOpen && (
                      <div className={`popup-menu ${isMenuOpen ? 'popup-enter' : 'popup-exit'} absolute right-0 mt-2 w-48 bg-gray-900/80 border border-gray-700 rounded-lg shadow-lg backdrop-blur-xl z-10`}>
                          <ul className="py-1">
                              <li>
                                  <button onClick={() => { onEdit(cardData); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50">
                                      <Icon name="edit" className="w-4 h-4" /> Edit Task
                                  </button>
                              </li>
                              <li>
                                  <button onClick={() => { onMoveToNextDay(cardData.ID); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50">
                                      <Icon name="forward" className="w-4 h-4" /> Move to Next Day
                                  </button>
                              </li>
                              <li>
                                  <button onClick={() => { onDelete(cardData.ID); setIsMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-gray-700/50">
                                      <Icon name="trash" className="w-4 h-4" /> Delete Task
                                  </button>
                              </li>
                          </ul>
                      </div>
                  )}
              </div>
          </div>
      )}

      <div className="flex flex-col h-full">
          <div className="flex-grow">
              <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30`}>
                      {t(SUBJECT_TAG)}
                  </span>
                  {'TIME' in cardData && cardData.TIME && <span className="text-sm font-mono text-gray-400">{cardData.TIME}</span>}
              </div>
              <h3 className="text-lg font-bold text-white my-3">{t(CARD_TITLE)}</h3>
              <p className="text-sm text-gray-400 mb-4">{t(FOCUS_DETAIL)}</p>
               {type === 'HOMEWORK' && 'Q_RANGES' in cardData && (
                <div className="text-xs font-mono text-cyan-300 space-y-1">
                  <span className="font-semibold text-gray-400">Questions:</span>
                  <div className="flex flex-wrap gap-2">
                    {cardData.Q_RANGES.split(';').map((range, idx) => (
                      <span key={idx} className="bg-gray-900/50 px-2 py-1 rounded">
                        {range.replace(/@p(\d+)/, ' (p. $1)')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

           {showActionsFooter && (
             <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex gap-2">
                  {isFlashcardReview && (
                    <button onClick={() => onStartReviewSession((cardData as ScheduleCardData).deckId!)} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-md bg-yellow-600/80 hover:bg-yellow-500/80 transition-colors">
                      <Icon name="cards" className="w-4 h-4" /> Start Review
                    </button>
                  )}
                  {canStartPractice && (
                    <button onClick={() => onStartPractice(cardData as HomeworkData)} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-md bg-purple-600/80 hover:bg-purple-500/80 transition-colors">
                      <Icon name="stopwatch" className="w-4 h-4" /> Start Practice
                    </button>
                  )}
                  {canCopyCommand && 'ACTION_COMMAND' in cardData && (
                    <button onClick={() => handleCopy(cardData.ACTION_COMMAND)} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-md bg-gray-700/60 hover:bg-gray-600/80 transition-colors">
                        <Icon name={copied ? "check" : "copy"} className={`w-4 h-4 ${copied ? 'text-green-400' : ''}`} /> {copied ? 'Copied!' : 'Copy Cmd'}
                    </button>
                  )}
                </div>
             </div>
           )}
           
      </div>
    </div>
  );
};

export default ScheduleCard;