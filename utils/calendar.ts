import { ScheduleItem } from '../types';

// Helper to format date to ICS format (YYYYMMDDTHHMMSSZ)
const toICSDate = (date: Date): string => {
    // Note: toISOString() returns UTC time, which is what ICS 'Z' indicates.
    return date.toISOString().replace(/-|:|\.\d+/g, '');
};

// Helper to get the date of the next occurrence of a given day of the week
const getNextDateForDay = (dayString: string): Date => {
    const days: { [key: string]: number } = {
        'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
        'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };
    const targetDayIndex = days[dayString.toUpperCase()];

    if (targetDayIndex === undefined) {
        // Fallback for invalid day string, return now
        console.warn(`Invalid day string provided to getNextDateForDay: ${dayString}`);
        return new Date();
    }

    const now = new Date();
    const currentDayIndex = now.getDay();
    let dayDifference = targetDayIndex - currentDayIndex;

    // If the target day is in the past for the current week, schedule it for the following week.
    if (dayDifference < 0) {
        dayDifference += 7;
    }

    const nextDate = new Date();
    nextDate.setDate(now.getDate() + dayDifference);
    return nextDate;
};


export const exportWeekCalendar = (items: ScheduleItem[], studentName: string): void => {
    // Filter for items that have a time property and it's not empty.
    const calendarEvents = items
        .filter(item => 'TIME' in item && item.TIME)
        .map(item => {
            // This type assertion is safe because of the filter above.
            const timedItem = item as { DAY: { EN: string }, TIME: string, ID: string, CARD_TITLE: { EN: string }, FOCUS_DETAIL: { EN: string } };

            const dayDate = getNextDateForDay(timedItem.DAY.EN);
            const [hours, minutes] = timedItem.TIME.split(':').map(Number);
            
            const startDate = new Date(dayDate);
            startDate.setHours(hours, minutes, 0, 0);

            // Assume a default duration of 1 hour for each study session
            const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

            const uid = `${timedItem.ID}@jeeschedulerpro.com`;
            const dtstamp = toICSDate(new Date());
            const dtstart = toICSDate(startDate);
            const dtend = toICSDate(endDate);

            // Sanitize text for ICS format
            const summary = timedItem.CARD_TITLE.EN.replace(/,/g, '\\,').replace(/;/g, '\\;');
            const description = timedItem.FOCUS_DETAIL.EN.replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\n/g, '\\n');

            return [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART:${dtstart}`,
                `DTEND:${dtend}`,
                `SUMMARY:${summary}`,
                `DESCRIPTION:${description}`,
                'END:VEVENT'
            ].join('\r\n');
        })
        .join('\r\n');

    const calendarContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//JEE Scheduler Pro//EN',
        calendarEvents,
        'END:VCALENDAR'
    ].join('\r\n');
    
    try {
        const blob = new Blob([calendarContent], { type: 'text/calendar;charset=utf-8;' });
        const link = document.createElement("a");
        
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${studentName.replace(/ /g, '_')}_schedule.ics`);
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Failed to export calendar:", error);
        alert("Sorry, there was an error exporting the calendar file.");
    }
};
