import { ScheduleItem } from '../types';
import { getIsSignedIn, handleSignIn, handleSignOut } from './googleAuth';

// Re-export auth handlers for components that use this file
export { handleSignIn, handleSignOut, getIsSignedIn };


declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const getEventResource = (item: ScheduleItem) => {
    if (!('TIME' in item && item.TIME && 'DAY' in item)) {
        return null;
    }

    const dayMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const taskDayIndex = dayMap.indexOf(item.DAY.EN.toUpperCase());
    if (taskDayIndex === -1) return null;

    const [hours, minutes] = item.TIME.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return null;

    const now = new Date();
    const firstDayOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    firstDayOfWeek.setDate(diff);
    firstDayOfWeek.setHours(0, 0, 0, 0);

    const eventDate = new Date(firstDayOfWeek);
    eventDate.setDate(firstDayOfWeek.getDate() + taskDayIndex);
    eventDate.setHours(hours, minutes, 0, 0);

    const startDate = new Date(eventDate);
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000); // 1-hour duration

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    return {
        summary: item.CARD_TITLE.EN,
        description: item.FOCUS_DETAIL.EN,
        start: {
            dateTime: startDate.toISOString(),
            timeZone: timeZone,
        },
        end: {
            dateTime: endDate.toISOString(),
            timeZone: timeZone,
        },
        reminders: {
            useDefault: false,
            overrides: [
                { method: 'popup', minutes: 15 },
            ],
        },
    };
};

export const createEvent = async (item: ScheduleItem): Promise<any> => {
    if (!getIsSignedIn()) throw new Error("User not signed in to Google.");
    const eventResource = getEventResource(item);
    if (!eventResource) throw new Error("Task is not time-based and cannot be added to calendar.");

    const request = window.gapi.client.calendar.events.insert({
        calendarId: 'primary',
        resource: eventResource,
    });
    const response = await request;
    return response.result;
};

export const updateEvent = async (eventId: string, item: ScheduleItem): Promise<any> => {
    if (!getIsSignedIn()) throw new Error("User not signed in to Google.");
    const eventResource = getEventResource(item);
    if (!eventResource) throw new Error("Task is not time-based and cannot be updated in calendar.");

    const request = window.gapi.client.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: eventResource,
    });
    const response = await request;
    return response.result;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    if (!getIsSignedIn()) throw new Error("User not signed in to Google.");
    const request = window.gapi.client.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
    });
    await request;
};
