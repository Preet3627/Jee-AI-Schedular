// FIX: Correct import path to point to types from the root directory.
import { ScheduleItem, HomeworkData, ScheduleCardData, ExamData } from '../types';

interface ParsedSchedule {
    sid?: string;
    item: ScheduleItem;
}
interface ParsedExam {
    sid?: string;
    item: ExamData;
}
interface ParsedMetric {
    sid?: string;
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
 * A robust, stateful CSV parser that handles quoted fields, escaped quotes,
 * and newlines within fields.
 * @param csvText The raw CSV string.
 * @returns An array of objects representing the rows.
 */
function parseCSV(csvText: string): Record<string, string>[] {
    const text = csvText.replace(/\r/g, '').trim();
    if (!text) return [];

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentField = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
        const char = text[i];

        if (inQuotes) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    // Escaped quote
                    currentField += '"';
                    i++;
                } else {
                    // End of quoted field
                    inQuotes = false;
                }
            } else {
                currentField += char;
            }
        } else {
            if (char === ',') {
                currentRow.push(currentField);
                currentField = '';
            } else if (char === '\n') {
                currentRow.push(currentField);
                rows.push(currentRow);
                currentRow = [];
                currentField = '';
            } else if (char === '"') {
                inQuotes = true;
            } else {
                currentField += char;
            }
        }
        i++;
    }

    // Add the final field and row
    currentRow.push(currentField);
    rows.push(currentRow);

    const nonEmptyRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0].trim() !== ''));
    if (nonEmptyRows.length < 2) {
        // Not enough rows for a header and data
        return [];
    }
    
    // The first non-empty line is assumed to be the header
    const header = nonEmptyRows[0].map(h => h.trim());
    const dataRows = nonEmptyRows.slice(1);
    
    return dataRows.map(row => {
        const obj: Record<string, string> = {};
        header.forEach((key, index) => {
            if (key) {
                obj[key] = row[index] ? row[index].trim() : '';
            }
        });
        return obj;
    });
}


export function parseCSVData(csvText: string, defaultSid?: string): ParsedCSVData {
    const parsedRows = parseCSV(csvText);
    const results: ParsedCSVData = { schedules: [], exams: [], metrics: [] };

    for (const row of parsedRows) {
        const type = row.TYPE?.toUpperCase();
        const sid = row.SID || defaultSid;

        if (type === 'ACTION' || type === 'HOMEWORK') {
            if (!row.ID || !row.DAY || !row.CARD_TITLE || !row.FOCUS_DETAIL || !row.SUBJECT_TAG) continue;
            if (type === 'ACTION' && !row.TIME) continue;

            let scheduleItem: ScheduleItem;
            if (type === 'HOMEWORK') {
                scheduleItem = {
                    ID: row.ID, type: 'HOMEWORK', DAY: createLocalizedString(row.DAY),
                    CARD_TITLE: createLocalizedString(row.CARD_TITLE), FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                    SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG.toUpperCase()), Q_RANGES: row.Q_RANGES || '', TIME: row.TIME || undefined,
                };
            } else { // ACTION
                scheduleItem = {
                    ID: row.ID, type: 'ACTION', SUB_TYPE: (row.SUB_TYPE as any) || 'DEEP_DIVE', DAY: createLocalizedString(row.DAY),
                    TIME: row.TIME, CARD_TITLE: createLocalizedString(row.CARD_TITLE), FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                    SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG.toUpperCase()),
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