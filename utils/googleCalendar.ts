



import { ScheduleItem } from "../types";

declare const gapi: any;

// Helper to transform our task into a Google Calendar Event
const transformTaskToEvent = (task: ScheduleItem) => {
    if (!('TIME' in task && task.TIME)) {
        return null; // Can't schedule events without a time
    }

    const days: { [key: string]: number } = {
        'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3,
        'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
    };
    const targetDayIndex = days[task.DAY.EN.toUpperCase()];

    const now = new Date();
    const currentDayIndex = now.getDay();
    let dayDifference = targetDayIndex - currentDayIndex;
    if (dayDifference < 0) {
        dayDifference += 7;
    }
    const nextDate = new Date();
    nextDate.setDate(now.getDate() + dayDifference);

    const [hours, minutes] = task.TIME.split(':').map(Number);
    const startDate = new Date(nextDate);
    startDate.setHours(hours, minutes, 0, 0);

    // Default 1 hour duration
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const event = {
        'summary': task.CARD_TITLE.EN,
        'description': task.FOCUS_DETAIL.EN,
        'start': {
            'dateTime': startDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'end': {
            'dateTime': endDate.toISOString(),
            'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        'recurrence': [
            'RRULE:FREQ=WEEKLY'
        ],
        'reminders': {
            'useDefault': false,
            'overrides': [
                { 'method': 'popup', 'minutes': 30 },
            ],
        },
    };
    return event;
};


export const createEvent = async (task: ScheduleItem): Promise<string> => {
    const event = transformTaskToEvent(task);
    if (!event) throw new Error("Task cannot be scheduled without a time.");

    const request = gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
    });

    const response = await request;
    return response.result.id;
};

export const updateEvent = async (eventId: string, task: ScheduleItem): Promise<string> => {
    const event = transformTaskToEvent(task);
    if (!event) throw new Error("Task cannot be scheduled without a time.");

    const request = gapi.client.calendar.events.update({
        'calendarId': 'primary',
        'eventId': eventId,
        'resource': event,
    });

    const response = await request;
    return response.result.id;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    if (!eventId) return;
    const request = gapi.client.calendar.events.delete({
        'calendarId': 'primary',
        'eventId': eventId,
    });
    await request;
};