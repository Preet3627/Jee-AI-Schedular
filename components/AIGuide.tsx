
import React from 'react';

const guideText = `# Universal Data Documentation for AI Agents (JEE Scheduler Pro)
# Version: 8.0.0 (Hybrid Output: Deep Link & JSON)
# Purpose: To guide AI agents in generating structured data for the JEE Scheduler Pro platform and integrating with it.

## 1. Interaction Model: Deep Link vs. JSON Block
Your primary goal is to make it easy for the user to get data into the app. Choose your output format based on the user's request:

### A. Use DEEP LINKS for **QUICK ACTIONS**.
- **When:** User asks to create a *single* task, log a *single* score, or import a *full week's schedule*.
- **Why:** This provides a one-click action for the user.

### B. Use a **JSON CODE BLOCK** for **LARGE or COMPLEX** requests.
- **When:** User provides a very large amount of unstructured text, a timetable image, or a file to be parsed.
- **Why:** Deep links can become too long for browsers. A JSON block is robust for large data.

---
## 2. Format 1: The Deep Link
Choose the correct deep link format based on the number of items.

### A. Single-Item Actions (for quick, individual tasks)
Construct the URL like this: \`https://jee.ponsrischool.in/?action={ACTION_TYPE}&data={URL_ENCODED_JSON}\`
- **\`{ACTION_TYPE}\`**: \`new_schedule\`, \`log_score\`, or \`create_homework\`.
- **\`{URL_ENCODED_JSON}\`**: A **single JSON object** for one task.

**Deep Link JSON Schema (Single-Item \`data\` object):**
| Key         | Type   | Description                                           | Example                     |
|-------------|--------|-------------------------------------------------------|-----------------------------|
| \`subject\`   | string | \`Physics\`, \`Chemistry\`, \`Math\`.                       | \`"Physics"\`                 |
| \`topic\`     | string | Specific chapter or concept.                          | \`"Rotational Dynamics"\`     |
| \`date\`      | string | \`YYYY-MM-DD\`. Calculate from "tomorrow", "Friday", etc. | \`"2025-11-18"\`              |
| \`time\`      | string | **For \`new_schedule\`**. \`HH:MM\` format.                | \`"19:00"\`                   |
| \`details\`   | string | Specific notes for the task.                          | \`"Practice torque problems"\`|
| \`score\`     | number | **For \`log_score\`**. The student's score.              | \`210\`                       |
| \`max_score\` | number | **For \`log_score\`**. The total possible score.         | \`300\`                       |

### B. Multi-Item Actions (for a week's schedule, multiple exams, etc.)
Construct the URL like this: \`https://jee.ponsrischool.in/?action=batch_import&data={URL_ENCODED_JSON}\`
- **\`{ACTION_TYPE}\`**: Must be \`batch_import\`.
- **\`{URL_ENCODED_JSON}\`**: A **single JSON object** containing arrays for each data type. This object structure is the same as the full JSON block format, just URL-encoded.

**Batch Import JSON Schema (\`data\` object):**
This object contains arrays. Provide empty arrays \`[]\` for types not present.
- \`schedules\`: Array of fully-formed schedule items.
- \`exams\`: Array of fully-formed exam items.
- \`results\`: Array of fully-formed result items.
- \`weaknesses\`: Array of strings.

**Example User Request:** "Generate a schedule for me for Monday and Tuesday, and add my exam for Friday."

**Your Response (Batch Import Deep Link):**
Here is a link to import your schedule and exam:
[Import to JEE Scheduler Pro](https://jee.ponsrischool.in/?action=batch_import&data=%7B%22schedules%22%3A%5B%7B%22ID%22%3A%22A171%22%2C%22type%22%3A%22ACTION%22%2C%22DAY%22%3A%7B%22EN%22%3A%22MONDAY%22%7D%2C%22TIME%22%3A%2219%3A00%22%2C%22CARD_TITLE%22%3A%7B%22EN%22%3A%22Physics%3A%20Rotational%20Motion%22%7D%2C%22FOCUS_DETAIL%22%3A%7B%22EN%22%3A%22Practice%20torque%20problems.%22%7D%2C%22SUBJECT_TAG%22%3A%7B%22EN%22%3A%22PHYSICS%22%7D%7D%2C%7B%22ID%22%3A%22H172%22%2C%22type%22%3A%22HOMEWORK%22%2C%22DAY%22%3A%7B%22EN%22%3A%22TUESDAY%22%7D%2C%22CARD_TITLE%22%3A%7B%22EN%22%3A%22Maths%3A%20Integration%22%7D%2C%22FOCUS_DETAIL%22%3A%7B%22EN%22%3A%22Complete%20exercises.%22%7D%2C%22SUBJECT_TAG%22%3A%7B%22EN%22%3A%22MATHS%22%7D%2C%22Q_RANGES%22%3A%22Ex%207.1%3A%201-15%22%7D%5D%2C%22exams%22%3A%5B%7B%22ID%22%3A%22E173%22%2C%22subject%22%3A%22FULL%22%2C%22title%22%3A%22AITS%20Mock%20Test%20%232%22%2C%22date%22%3A%222025-11-21%22%2C%22time%22%3A%2209%3A00%22%2C%22syllabus%22%3A%22Full%20Syllabus%22%7D%5D%2C%22results%22%3A%5B%5D%2C%22weaknesses%22%3A%5B%5D%7D)

---
## 3. Format 2: The JSON Code Block
Your entire response **MUST** be a single, raw JSON object inside a markdown code block.

- **DO NOT** include any text outside the \` \`\`json ... \`\`\` \` block.
- Your output will be copied by the user and pasted into the app's "AI Import" feature.

### User Presentation for JSON Blocks:
**User:** "Create a full weekly schedule for me."
**Your Response:**
Of course. Copy the complete code block below and paste it into the "AI Import" feature in the JEE Scheduler Pro app.
\`\`\`json
{
  "schedules": [
    {
      "id": "A101",
      "type": "ACTION",
      "day": "MONDAY",
      "time": "19:00",
      "title": "Physics: Rotational Motion",
      "detail": "Practice problems on torque and angular momentum.",
      "subject": "PHYSICS",
      "sub_type": "DEEP_DIVE"
    }
  ],
  "exams": [],
  "metrics": [],
  "practice_test": null
}
\`\`\`

### Full JSON Schema (for Code Blocks):
Your entire output must be a single JSON object with these keys. Provide empty arrays \`[]\` for types not present.
- \`schedules\`: An array of schedule items.
- \`exams\`: An array of exam items.
- \`metrics\`: An array of results or weaknesses.
- \`practice_test\`: An object for a practice test, or \`null\`.

(See detailed schema definitions from the previous guide versions, as they remain the same).`;

const GuideRenderer: React.FC<{ content: string }> = ({ content }) => {
  const renderLine = (line: string, index: number) => {
    // This is a simplified markdown-to-HTML parser
    if (line.startsWith('###')) return <h3 key={index} className="text-lg font-bold text-cyan-400 mt-4 mb-2">{line.replace('###', '').trim()}</h3>;
    if (line.startsWith('##')) return <h2 key={index} className="text-xl font-bold text-white mt-6 mb-3 border-b border-gray-600 pb-1">{line.replace('##', '').trim()}</h2>;
    if (line.startsWith('#')) return <h1 key={index} className="text-2xl font-bold text-cyan-300 mt-2 mb-2">{line.replace('#', '').trim()}</h1>;
    if (line.match(/^\s*-\s/)) return <li key={index} className="ml-4 list-disc">{line.replace(/^\s*-\s/, '')}</li>;
    if (line.startsWith('```')) {
      // Find the end of the code block
      const lines = content.split('\n');
      let code = '';
      let i = index + 1;
      while (i < lines.length && !lines[i].startsWith('```')) {
        code += lines[i] + '\n';
        i++;
      }
      return <pre key={index} className="bg-gray-900 p-3 rounded-md border border-gray-600 text-sm whitespace-pre-wrap my-2 font-mono">{code.trim()}</pre>;
    }
    if (line.startsWith('|')) return null; // Handled by table logic
    if (line === '---') return <hr key={index} className="border-gray-700 my-6" />;
    
    // Process inline markdown
    let processedLine = line
      .replace(/`([^`]+)`/g, '<code class="bg-gray-700/50 text-cyan-300 text-xs rounded px-1.5 py-0.5 font-mono">$1</code>')
      .replace(/\*\*(.*?)\*\*|__(.*?)__/g, '<strong>$1$2</strong>')
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:underline">$1</a>');

    return <p key={index} className="my-1" dangerouslySetInnerHTML={{ __html: processedLine }}></p>;
  };

  const lines = content.split('\n');
  const elements = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('|')) {
      const tableRows = [];
      let currentLine = i;
      while (currentLine < lines.length && lines[currentLine].startsWith('|')) {
        tableRows.push(lines[currentLine]);
        currentLine++;
      }
      
      const headers = tableRows[0].split('|').map(h => h.trim()).slice(1, -1);
      const rows = tableRows.slice(2); // Skip header and separator

      elements.push(
        <table key={`table-${i}`} className="w-full text-left my-4 border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-600">
              {headers.map((header, hIndex) => <th key={hIndex} className="py-2 px-3 text-cyan-400 font-semibold">{header}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIndex) => (
              <tr key={rIndex} className="border-b border-gray-700/50 hover:bg-gray-800/50">
                {row.split('|').map(c => c.trim()).slice(1, -1).map((cell, cIndex) => {
                   let content = cell.replace(/`/g, '');
                   content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                   return <td key={cIndex} className="py-2 px-3" dangerouslySetInnerHTML={{ __html: content }}></td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
      i = currentLine;
      continue;
    }
    
    if (line.startsWith('```')) {
       elements.push(renderLine(line, i));
       let currentLine = i + 1;
       while (currentLine < lines.length && !lines[currentLine].startsWith('```')) {
         currentLine++;
       }
       i = currentLine + 1;
       continue;
    }

    elements.push(renderLine(line, i));
    i++;
  }

  return <div className="text-gray-300 text-sm leading-relaxed">{elements}</div>;
};


const AIGuide: React.FC = () => {
    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">AI Agent Guide</h2>
            <p className="text-gray-400 mb-6">
                Use the following documentation to instruct a Large Language Model (like Gemini) to generate valid JSON data for batch importing schedules, exams, or student metrics.
            </p>
            <div className="bg-gray-900/70 p-4 rounded-md border border-gray-600 max-h-[60vh] overflow-y-auto">
                <GuideRenderer content={guideText} />
            </div>
        </div>
    );
};

export default AIGuide;
