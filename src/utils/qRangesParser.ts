/**
 * Parses a complex Q_RANGES string into a simpler format for the MCQ timer.
 * e.g., "L1:1-10@p45;PYQ:5-15" -> "1-10;5-15"
 */
export function parseQRangesToSimpleString(qRanges: string): string {
  if (!qRanges) return '';
  return qRanges
    .split(';')
    .map(part => {
      // Remove page number, e.g., @p45
      let cleanPart = part.replace(/@p\d+/g, '').trim();
      // Remove category prefix, e.g., L1:
      const parts = cleanPart.split(':');
      return parts.length > 1 ? parts[1] : parts[0];
    })
    .join(';');
}

/**
 * Parses a simple or complex Q_RANGES string into a flat array of question numbers.
 */
export const getQuestionNumbersFromRanges = (qRanges: string): number[] => {
  const simpleRanges = parseQRangesToSimpleString(qRanges);
  const numbers: number[] = [];
  simpleRanges.split(';').forEach(part => {
      part = part.trim();
      if (part.includes('-')) {
          const [start, end] = part.split('-').map(Number);
          if (!isNaN(start) && !isNaN(end) && start <= end) {
              for (let i = start; i <= end; i++) {
                  numbers.push(i);
              }
          }
      } else {
          const num = Number(part);
          if (!isNaN(num) && num > 0) {
              numbers.push(num);
          }
      }
  });
  return [...new Set(numbers)].sort((a,b) => a-b); // Remove duplicates and sort
};
