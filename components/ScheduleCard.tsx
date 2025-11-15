import React, { useState, useEffect, useRef } from 'react';
import { ScheduleItem } from '../types';
import { useLocalization } from '../context/LocalizationContext';
import Icon from './Icon';

interface ScheduleCardProps {
  cardData: ScheduleItem;
  onDelete: (id: string) => void;
  onEdit: (item: ScheduleItem) => void;
  onMoveToNextDay: (id: string) => void;
  onMarkDoubt?: (topic: string, q_id: string) => void;
  isSubscribed: boolean;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ cardData, onDelete, onEdit, onMoveToNextDay, onMarkDoubt, isSubscribed }) => {
    const { t } = useLocalization();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isManageable = cardData.type === 'ACTION' || cardData.type === 'HOMEWORK';
    const { CARD_TITLE, SUBJECT_TAG, FOCUS_DETAIL, type } = cardData;

    const canCopyCommand = cardData.type === 'ACTION' && 'ACTION_COMMAND' in cardData && !!cardData.ACTION_COMMAND;
    const canAddToCalendar = (cardData.type === 'ACTION' || cardData.type === 'HOMEWORK') && 'TIME' in cardData && !!cardData.TIME;
    
    const showActionsFooter = canCopyCommand || canAddToCalendar;

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
    
    const handleAddToCalendar = () => {
        if (!('TIME' in cardData && cardData.TIME && 'DAY' in cardData)) {
          alert('This task does not have a specific time and day to add to the calendar.');
          return;
        }
        
        const dayMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
        const taskDayIndex = dayMap.indexOf(cardData.DAY.EN.toUpperCase());
        if (taskDayIndex === -1) {
            alert("Invalid day specified for the task.");
            return;
        }
        
        const [hours, minutes] = cardData.TIME.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            alert("Invalid time format for the task.");
            return;
        }

        const now = new Date();
        let eventDate = new Date();
        const currentDayIndex = eventDate.getDay();
        let dayDifference = taskDayIndex - currentDayIndex;

        // If the day is in the past for the current week, schedule it for the next week
        if (dayDifference < 0 || (dayDifference === 0 && (now.getHours() > hours || (now.getHours() === hours && now.getMinutes() > minutes)))) {
            dayDifference += 7;
        }

        eventDate.setDate(now.getDate() + dayDifference);
        eventDate.setHours(hours, minutes, 0, 0);

        const toICSDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');
        const startDate = toICSDate(eventDate);
        const endDate = toICSDate(new Date(eventDate.getTime() + 60 * 60 * 1000)); // Assume 1-hour duration
        
        const icsContent = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
            `DTSTART:${startDate}Z`, `DTEND:${endDate}Z`,
            `SUMMARY:${t(cardData.CARD_TITLE)}`,
            `DESCRIPTION:${t(cardData.FOCUS_DETAIL)}`,
            'BEGIN:VALARM', 'TRIGGER:-PT15M', 'ACTION:DISPLAY', 'DESCRIPTION:Reminder', 'END:VALARM',
            'END:VEVENT', 'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${t(cardData.CARD_TITLE).replace(/ /g, '_')}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

  return (
    <div className="bg-gray-800/50 rounded-lg border border-gray-700/80 p-5 transition-all duration-300 hover:border-cyan-500/50 hover:shadow-2xl hover:shadow-cyan-500/10 relative backdrop-blur-sm group">
      
      {isManageable && (
          <div className="absolute top-3 right-3" ref={menuRef}>
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
                        {range.replace('@p', ' (p.') + (range.includes('@p') ? ')' : '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
          </div>

           {showActionsFooter && (
             <div className="mt-4 pt-4 border-t border-gray-700/50">
                <div className="flex gap-2">
                  {canAddToCalendar && (
                    <button onClick={handleAddToCalendar} className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold py-2 px-3 rounded-md bg-gray-700/60 hover:bg-gray-600/80 transition-colors">
                      <Icon name="calendar" className="w-4 h-4" /> Add to Calendar
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