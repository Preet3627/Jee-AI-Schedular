import { ScheduleItem, HomeworkData, ScheduleCardData } from '../types';

function createLocalizedString(text: string) {
    return { EN: text || '', GU: '' };
}

function parseCSV(csvText: string): any[] {
    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const header = lines[0].split(',').map(h => h.trim());
    const rows = lines.slice(1).map(line => {
        const row: { [key: string]: string } = {};
        // Basic CSV parsing, may not handle quoted commas perfectly
        line.split(',').forEach((value, index) => {
            if (header[index]) {
                row[header[index]] = value.trim();
            }
        });
        return row;
    });
    return rows;
}

export function parseScheduleCSV(csvText: string, defaultSid?: string): { sid: string, item: ScheduleItem }[] {
    const parsedRows = parseCSV(csvText);
    const results: { sid: string, item: ScheduleItem }[] = [];

    for (const row of parsedRows) {
        const type = row.TYPE?.toUpperCase();
        const sid = row.SID || defaultSid;

        if (!sid || !row.ID || !row.DAY || !row.CARD_TITLE || !row.FOCUS_DETAIL || !row.SUBJECT_TAG) {
            console.warn('Skipping invalid CSV row (missing required fields):', row);
            continue;
        }

        if (type === 'HOMEWORK') {
            const homework: HomeworkData = {
                ID: row.ID,
                type: 'HOMEWORK',
                DAY: createLocalizedString(row.DAY),
                CARD_TITLE: createLocalizedString(row.CARD_TITLE),
                FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG),
                Q_RANGES: row.Q_RANGES || '',
                TIME: row.TIME || undefined,
            };
            results.push({ sid, item: homework });
        } else if (type === 'ACTION') {
            if (!row.TIME) {
                 console.warn('Skipping invalid ACTION row (missing TIME):', row);
                 continue;
            }
            const action: ScheduleCardData = {
                ID: row.ID,
                type: 'ACTION',
                SUB_TYPE: row.SUB_TYPE as any || 'DEEP_DIVE',
                DAY: createLocalizedString(row.DAY),
                TIME: row.TIME,
                CARD_TITLE: createLocalizedString(row.CARD_TITLE),
                FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG),
                ACTION_COMMAND: row.ACTION_COMMAND || undefined,
                UNACADEMY_QUERY: row.UNACADEMY_QUERY || undefined,
            };
            results.push({ sid, item: action });
        }
    }
    return results;
}