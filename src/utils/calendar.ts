import { ScheduleItem } from '../types';

// This creates a floating time format: YYYYMMDDTHHMMSS, which calendar apps interpret in the user's local timezone.
const toICSDate = (date: Date): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

const generateVEvent = (item: ScheduleItem): string | null => {
    if (!('TIME' in item && item.TIME && 'DAY' in item)) {
        return null;
    }
    
    const dayMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const taskDayIndex = dayMap.indexOf(item.DAY.EN.toUpperCase());
    if (taskDayIndex === -1) return null;
    
    const [hours, minutes] = item.TIME.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();
    // Start of the current week (assuming Monday is the first day)
    const firstDayOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    firstDayOfWeek.setDate(diff);
    firstDayOfWeek.setHours(0,0,0,0);
    
    const eventDate = new Date(firstDayOfWeek);
    eventDate.setDate(firstDayOfWeek.getDate() + taskDayIndex - (firstDayOfWeek.getDay() === 0 ? 6 : firstDayOfWeek.getDay() - 1) );
    eventDate.setHours(hours, minutes, 0, 0);

    const startDate = toICSDate(eventDate);
    const endDate = toICSDate(new Date(eventDate.getTime() + 60 * 60 * 1000)); // Assume 1-hour duration
    
    const event = [
        'BEGIN:VEVENT',
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${item.CARD_TITLE.EN}`,
        `DESCRIPTION:${item.FOCUS_DETAIL.EN}`,
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder',
        'END:VALARM',
        'END:VEVENT'
    ];

    return event.join('\r\n');
};


export const exportWeekCalendar = (scheduleItems: ScheduleItem[], studentName: string) => {
    const events = scheduleItems.map(generateVEvent).filter(Boolean).join('\r\n');

    if (!events) {
        alert('No timed events found in the schedule to export.');
        return;
    }

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JEE Scheduler Pro//EN',
        events,
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${studentName}_Week_Schedule.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
