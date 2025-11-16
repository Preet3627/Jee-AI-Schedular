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
    
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        
        if (inQuotes) {
            if (char === '"') {
                // Check for escaped quote ""
                if (i + 1 < text.length && text[i + 1] === '"') {
                    currentField += '"';
                    i++; // Skip the next quote
                } else {
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
            } else if (char === '"' && currentField === '') {
                inQuotes = true;
            } else {
                currentField += char;
            }
        }
    }
    // Push the final field and row
    currentRow.push(currentField);
    rows.push(currentRow);

    // Filter out rows that are completely empty or just contain empty strings
    const nonEmptyRows = rows.filter(row => row.some(field => field.trim() !== ''));

    if (nonEmptyRows.length < 2) {
        // Not enough rows for a header and data
        return [];
    }

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
    const results: ParsedCSVData = { schedules: [], exams: [], metrics: [] };
    if (!csvText || !csvText.trim()) {
        return results;
    }

    // --- PRE-PROCESSING STEP for single-line CSVs from Gemini ---
    let processedCsvText = csvText.trim();
    const newlineCount = (processedCsvText.match(/\n/g) || []).length;

    // Heuristic: If we have a long string with very few newlines, it's likely a malformed single-line CSV.
    if (processedCsvText.length > 200 && newlineCount < 5) {
        // This regex finds a space that is immediately followed by a typical row ID (A, H, or E + digits).
        // This pattern is a strong indicator of where a new row should begin in a malformed single-line CSV.
        const rowStartRegex = / (?=[AHE]\d{2,})/g;
        
        // Ensure the header is on its own line by splitting at the first occurence of a row ID pattern.
        const firstIdMatch = processedCsvText.match(/[AHE]\d{2,}/);
        if (firstIdMatch && firstIdMatch.index > 0) {
            const headerEndIndex = firstIdMatch.index;
            const header = processedCsvText.substring(0, headerEndIndex).trim();
            const data = processedCsvText.substring(headerEndIndex);
            
            // Re-assemble with a newline after the header, and then replace spaces with newlines for subsequent rows.
            processedCsvText = header + '\n' + data.replace(rowStartRegex, '\n');
        } else {
             // Fallback for cases where the header split isn't clean, just try replacing spaces before IDs.
             processedCsvText = processedCsvText.replace(rowStartRegex, '\n');
        }
    }
    // --- END PRE-PROCESSING STEP ---
    
    const lines = processedCsvText.trim().split('\n');
    let currentBlock = '';
    const blocks: string[] = [];

    // --- ROBUST BLOCK SPLITTING LOGIC ---
    let processingStarted = false;
    for (const line of lines) {
        // Skip empty lines that might be between blocks
        if (!line.trim()) continue;

        const normalizedLine = line.replace(/[\s"]/g, '').toLowerCase();

        // More robust header detection based on key fields, not the exact full string.
        // This allows for column reordering, missing optional columns, or minor variations.
        const scheduleKeys = ['id', 'type', 'day', 'card_title', 'subject_tag'];
        const examKeys = ['id', 'type', 'subject', 'title', 'date'];
        const metricsKeys = ['type', 'score', 'mistakes', 'weaknesses'];

        const isScheduleHeader = scheduleKeys.every(key => normalizedLine.includes(key));
        const isExamHeader = examKeys.every(key => normalizedLine.includes(key));
        // For metrics, it's a valid header if it contains 'type' and at least one of the data columns.
        const isMetricsHeader = normalizedLine.includes('type') && metricsKeys.some(key => normalizedLine.includes(key));

        const isHeader = isScheduleHeader || isExamHeader || isMetricsHeader;

        if (isHeader) {
            // Found a header, so push the previous block if it exists
            if (currentBlock.trim()) {
                blocks.push(currentBlock);
            }
            // Start a new block with the header
            currentBlock = line;
            processingStarted = true;
        } else if (processingStarted) { 
            // Only add data lines after the first header has been found.
            // This ignores any junk text at the beginning of the file.
            currentBlock += '\n' + line;
        }
    }
    // Add the last processed block
    if (currentBlock.trim()) {
        blocks.push(currentBlock);
    }
    
    // Fallback: If no blocks were created (e.g., no known headers found, or only one block of data),
    // treat the entire non-empty input as a single block. This makes the parser much more flexible.
    if (blocks.length === 0 && processedCsvText.trim()) {
        blocks.push(processedCsvText.trim());
    }
    // --- END LOGIC ---
    
    for (const block of blocks) {
        const parsedRows = parseCSV(block.trim());
        if (parsedRows.length === 0) continue;

        const headerKeys = Object.keys(parsedRows[0]).map(k => k.toUpperCase());
        const keySet = new Set(headerKeys);

        if (keySet.has('CARD_TITLE') && keySet.has('DAY')) { // Schedule block
            for (const row of parsedRows) {
                const type = row.TYPE?.toUpperCase();
                const sid = row.SID || defaultSid;

                // Basic validation for a schedule item
                if (row.ID && row.DAY && row.CARD_TITLE && row.FOCUS_DETAIL && row.SUBJECT_TAG) {
                    let scheduleItem: ScheduleItem | null = null;
                    if (type === 'HOMEWORK') {
                        scheduleItem = {
                            ID: row.ID, type: 'HOMEWORK', DAY: createLocalizedString(row.DAY),
                            CARD_TITLE: createLocalizedString(row.CARD_TITLE), FOCUS_DETAIL: createLocalizedString(row.FOCUS_DETAIL),
                            SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG.toUpperCase()), Q_RANGES: row.Q_RANGES || '', TIME: row.TIME || undefined,
                        };
                    } else if (type === 'ACTION') {
                        if (!row.TIME) continue; // ACTION type requires a TIME
                        
                        // --- HEURISTIC to detect mislabeled HOMEWORK as ACTION ---
                        const title = row.CARD_TITLE || '';
                        const detail = row.FOCUS_DETAIL || '';
                        const qRanges = row.Q_RANGES || '';
                        const isLikelyHomework = /homework/i.test(title) || /homework/i.test(detail);
                        const qRangeInDetailRegex = /(?:Q:|Qs:|Questions:)\s*([^\n,]+)/i;
                        const match = detail.match(qRangeInDetailRegex);

                        // If it looks like homework and has Q_RANGES in the detail text, but not in the Q_RANGES column...
                        if (isLikelyHomework && match && !qRanges) {
                            const extractedQRange = match[1].trim();
                            // It's a HOMEWORK item masquerading as an ACTION. Convert it.
                            scheduleItem = {
                                ID: row.ID, type: 'HOMEWORK', DAY: createLocalizedString(row.DAY),
                                CARD_TITLE: createLocalizedString(title), 
                                FOCUS_DETAIL: createLocalizedString(detail.replace(qRangeInDetailRegex, '').trim()), // Clean up detail
                                SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG.toUpperCase()), 
                                Q_RANGES: extractedQRange,
                                TIME: row.TIME || undefined, // Homework can have an optional time
                            };
                        } else {
                             // It's a regular ACTION item.
                            scheduleItem = {
                                ID: row.ID, type: 'ACTION', SUB_TYPE: (row.SUB_TYPE as any) || 'DEEP_DIVE', DAY: createLocalizedString(row.DAY),
                                TIME: row.TIME, CARD_TITLE: createLocalizedString(title), FOCUS_DETAIL: createLocalizedString(detail),
                                SUBJECT_TAG: createLocalizedString(row.SUBJECT_TAG.toUpperCase()),
                            };
                        }
                    }
                    if (scheduleItem) {
                        results.schedules.push({ sid, item: scheduleItem });
                    }
                }
            }
        } else if (keySet.has('TITLE') && keySet.has('DATE')) { // Exam block
            for (const row of parsedRows) {
                if (row.ID && row.SUBJECT && row.TITLE && row.DATE && row.TIME && row.SYLLABUS) {
                    const sid = row.SID || defaultSid;
                    const examItem: ExamData = {
                        ID: row.ID, subject: row.SUBJECT.toUpperCase() as any, title: row.TITLE,
                        date: row.DATE, time: row.TIME, syllabus: row.SYLLABUS
                    };
                    results.exams.push({ sid, item: examItem });
                }
            }
        } else if (keySet.has('SCORE') || keySet.has('MISTAKES') || keySet.has('WEAKNESSES') || (keySet.has('TYPE') && (keySet.has('SID') || keySet.has('SCORE')))) { // Metrics block
            for (const row of parsedRows) {
                const type = row.TYPE?.toUpperCase();
                const sid = row.SID || defaultSid;
                let metricItem;
                if (type === 'RESULT' && row.SCORE && row.MISTAKES) {
                    metricItem = { type: 'RESULT' as const, score: row.SCORE, mistakes: row.MISTAKES.split(';').map(m => m.trim()).filter(Boolean) };
                } else if (type === 'WEAKNESS' && row.WEAKNESSES) {
                    metricItem = { type: 'WEAKNESS' as const, weaknesses: row.WEAKNESSES.split(';').map(w => w.trim()).filter(Boolean) };
                }
                if (metricItem) {
                    results.metrics.push({ sid, item: metricItem });
                }
            }
        }
    }
    
    return results;
}