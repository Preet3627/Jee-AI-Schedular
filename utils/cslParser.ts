
import { ScheduleItem, HomeworkData, ScheduleCardData, ExamData } from '../types';

interface ParsedSchedule {
    sid: string;
    item: ScheduleItem;
}
interface ParsedExam {
    sid: string;
    item: ExamData;
}
interface ParsedMetric {
    sid: string;
    item: {
        type: 'RESULT' | 'WEAKNESS';
        score?: string;
        mistakes?: string[];
        weaknesses?: string[];
    }
}

export interface ParsedCSVData {
    schedules: ParsedSchedule[];
    exams: ParsedExam[];
    metrics: ParsedMetric[];
}

function createLocalizedString(text: string) {
    return { EN: text || '', GU: '' };
}

/**
 * A robust CSV parser that handles quoted fields, escaped quotes, and empty fields.
 * @param csvText The raw CSV string.
 * @returns An array of objects representing the rows.
 */
function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.replace(/\r/g, '').split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) {
        return [];
    }

    const parseLine = (line: string): string[] => {
        const values: string[] = [];
        let currentField = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                    // This is an escaped double quote (""), so add a single " to the field
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
                    // This is a starting or ending quote
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(currentField);
                currentField = '';
            } else {
                currentField += char;
            }
        }
        values.push(currentField); // Add the last field
        return values;
    };
    
    const header = parseLine(lines[0]).map(h => h.trim());
    const dataRows = lines.slice(1);

    return dataRows.map(line => {
        const row: Record<string, string> = {};
        const values = parseLine(line);

        header.forEach((key, index) => {
            if (key) {
                row[key] = values[index] || '';
            }
        });
        return row;
    });
}


export function parseCSVData(csvText: string, defaultSid?: string): ParsedCSVData {
    const parsedRows = parseCSV(csvText);
    const results: ParsedCSVData = { schedules: [], exams: [], metrics: [] };

    for (const row of parsedRows) {
        const type = row.TYPE?.toUpperCase();
        const sid = row.SID || defaultSid;
        if (!sid) continue;

        if (type === 'ACTION' || type === 'HOMEWORK') {
            if (!row.ID || !row.DAY || !row.CARD_TITLE || !row.FOCUS_DETAIL || !row.SUBJECT_TAG) continue;
            if (type === 'ACTION' && !row.TIME) continue;

            let scheduleItem: ScheduleItem;
            if (type === 'HOMEWORK') {
                scheduleItem = {
                    ID: row.ID, type: 'HOMEWORK', DAY: createLocalizedString(row.DAY),
                    CARD_TITLE: createLocalizedString(row.CARD_TITLE), FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                    SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG), Q_RANGES: row.Q_RANGES || '', TIME: row.TIME || undefined,
                };
            } else { // ACTION
                scheduleItem = {
                    ID: row.ID, type: 'ACTION', SUB_TYPE: (row.SUB_TYPE as any) || 'DEEP_DIVE', DAY: createLocalizedString(row.DAY),
                    TIME: row.TIME, CARD_TITLE: createLocalizedString(row.CARD_TITLE), FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                    SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG),
                };
            }
            results.schedules.push({ sid, item: scheduleItem });

        } else if (type === 'EXAM') {
            if (!row.ID || !row.SUBJECT || !row.TITLE || !row.DATE || !row.TIME || !row.SYLLABUS) continue;
            const examItem: ExamData = {
                ID: row.ID, subject: row.SUBJECT.toUpperCase() as any, title: row.TITLE,
                date: row.DATE, time: row.TIME, syllabus: row.SYLLABUS
            };
            results.exams.push({ sid, item: examItem });

        } else if (type === 'RESULT' || type === 'WEAKNESS') {
            let metricItem;
            if (type === 'RESULT' && row.SCORE && row.MISTAKES) {
                metricItem = { type: 'RESULT', score: row.SCORE, mistakes: row.MISTAKES.split(';').map(m => m.trim()).filter(Boolean) };
            } else if (type === 'WEAKNESS' && row.WEAKNESSES) {
                metricItem = { type: 'WEAKNESS', weaknesses: row.WEAKNESSES.split(';').map(w => w.trim()).filter(Boolean) };
            }
            if (metricItem) {
                results.metrics.push({ sid, item: metricItem });
            }
        }
    }
    return results;
}
