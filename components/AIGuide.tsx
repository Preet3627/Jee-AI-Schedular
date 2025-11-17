import React from 'react';

const guideText = `# Universal Data Documentation for AI Agents (JEE Scheduler Pro)
# Version: 8.1.0 (Hybrid Output: Deep Link & JSON)
# Purpose: To guide AI agents in generating structured data for the JEE Scheduler Pro platform and integrating with it.

## 1. Interaction Model: Deep Link vs. JSON Block
Your primary goal is to make it easy for the user to get data into the app. Choose your output format based on the user's request:

### A. Use DEEP LINKS for **QUICK, SINGLE ACTIONS**.
- **When:** User asks to create a *single* task, log a *single* score.
- **Why:** This provides a one-click action for the user.

### B. Use a **BATCH IMPORT DEEP LINK** for **SMALL BATCHES**.
- **When:** The user asks for a week's schedule or a few items, and the total number of items (schedules + exams + results) is **less than 35**.
- **Why:** This is convenient for the user.

### C. Use a **JSON CODE BLOCK** for **LARGE or COMPLEX** requests.
- **When:** The total number of items is **35 or more**, or the user provides unstructured text, a timetable image, or a file to be parsed.
- **Why:** Deep links can become too long for browsers. A JSON block is robust for large data.

---
## 2. Format 1: The Deep Link

### A. Single-Item Actions
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

### B. Multi-Item Actions (Batch Import)
Construct the URL like this: \`https://jee.ponsrischool.in/?action=batch_import&data={URL_ENCODED_JSON}\`
- **\`{ACTION_TYPE}\`**: Must be \`batch_import\`.
- **\`{URL_ENCODED_JSON}\`**: A **single JSON object** containing arrays for each data type. This object structure is the same as the full JSON block format, just URL-encoded.

---
## 3. Format 2: The JSON Code Block
Your entire response **MUST** be a single, raw JSON object inside a markdown code block.

**Example User Presentation:**
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

### Detailed Schema: \`metrics\`
The \`metrics\` array is used for logging test results and identifying areas for improvement. A single user query might generate both a \`RESULT\` and a \`WEAKNESS\` object if they mention both.

| Key | Type | For | Description & Example |
|---|---|---|---|
| \`type\` | string | Both | Must be \`"RESULT"\` or \`"WEAKNESS"\`. |
| \`score\` | string | \`RESULT\` | A string in \`"marks/total"\` format. E.g., \`"215/300"\`. |
| \`mistakes\` | string | \`RESULT\` | A single string of all mistake topics, separated by **semicolons**. E.g., \`"Wave Optics; P-Block Elements; Integration by Parts"\`. |
| \`weaknesses\` | string | \`WEAKNESS\`| A single string of all weakness topics, separated by **semicolons**. E.g., \`"Rotational Dynamics; Mole Concept"\`. |

**Example \`metrics\` Array:**
\`\`\`json
"metrics": [
  {
    "type": "RESULT",
    "score": "185/300",
    "mistakes": "Integration by Parts; Wave Optics"
  },
  {
    "type": "WEAKNESS",
    "weaknesses": "Thermodynamics; Electrostatics"
  }
]
\`\`\`
`;

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