

import React from 'react';

const guideText = `# Universal Data Documentation for AI Agents (JEE Scheduler Pro)
# Version: 5.0.0 (JSON Only)
# Purpose: To guide AI agents in generating structured JSON data for the JEE Scheduler Pro platform.

## 1. CRITICAL AI BEHAVIOR: Output Raw JSON ONLY
When a user asks you to generate a schedule, timetable, etc., and you are instructed to provide a structured response for the "JEE Scheduler Pro" app, your entire response **MUST** be a single, raw JSON object.
- **DO NOT** include any explanations, apologies, conversational text, or markdown formatting like \`\`\`json\`\`\` before or after the data.
- Your output will be parsed directly by a machine. Any extra text will cause the import to fail.

---
## 2. General Rules & Best Practices
- **Format:** A single JSON object with top-level keys: \`schedules\`, \`exams\`, \`metrics\`.
- **Data Correction:** Automatically fix common formatting issues. Convert dates to \`YYYY-MM-DD\`. Convert times to \`HH:MM\` (24-hour).
- **ID Generation:** Generate a unique alphanumeric ID for each new schedule or exam item.
- **Scheduling Logic (CRITICAL):**
    - For weekdays (Monday-Saturday), schedule study \`ACTION\` tasks between **17:00 (5 PM) and 23:30 (11:30 PM)**.
    - If a major mock exam is on a Sunday, do NOT schedule other tasks between **07:00 (7 AM) and 13:00 (1 PM)**.
- **\`type\` Field (CRITICAL):**
  - If a task involves solving specific questions, its \`type\` **MUST** be \`HOMEWORK\`.
  - If it is a timed study block, its \`type\` **MUST** be \`ACTION\`.

---
## 3. Top-Level JSON Structure
Your entire output must be a single JSON object with these keys. If a type of data is not present, you must provide an empty array \`[]\`.
\`\`\`json
{
  "schedules": [ /* ... schedule items ... */ ],
  "exams": [ /* ... exam items ... */ ],
  "metrics": [ /* ... metric items ... */ ]
}
\`\`\`

---
### 3.1 \`schedules\` Array Items
| Key         | Type   | Description                                           | Example                               |
|-------------|--------|-------------------------------------------------------|---------------------------------------|
| \`id\`        | string | Unique ID (e.g., \`A101\`, \`H202\`).                     | \`"A101"\`                              |
| \`type\`      | string | \`"ACTION"\` or \`"HOMEWORK"\`.                           | \`"ACTION"\`                            |
| \`day\`       | string | Full day name, uppercase (e.g., \`MONDAY\`).            | \`"FRIDAY"\`                            |
| \`time\`      | string | \`HH:MM\` format. Required for \`ACTION\`.                | \`"20:30"\`                             |
| \`title\`     | string | Concise title of the task.                            | \`"Rotational Dynamics Deep Dive"\`     |
| \`detail\`    | string | A descriptive explanation.                            | \`"Fix FBD, Tension errors."\`          |
| \`subject\`   | string | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, etc.                 | \`"PHYSICS"\`                           |
| \`q_ranges\`  | string | **For \`HOMEWORK\` only.** Semicolon-separated.         | \`"L1:1-10@p45;PYQ:5-15"\`              |
| \`sub_type\`  | string | **For \`ACTION\` only.** \`DEEP_DIVE\`, \`ANALYSIS\`, etc.  | \`"DEEP_DIVE"\`                         |

**\`schedules\` Example:**
\`\`\`json
{
  "id": "A102",
  "type": "ACTION",
  "day": "WEDNESDAY",
  "time": "20:00",
  "title": "Rotational Dynamics",
  "detail": "Focus on Free Body Diagrams, solve 10 PYQs.",
  "subject": "PHYSICS",
  "sub_type": "DEEP_DIVE"
}
\`\`\`

---
### 3.2 \`exams\` Array Items
| Key        | Type   | Description                                | Example                                |
|------------|--------|--------------------------------------------|----------------------------------------|
| \`id\`       | string | Unique ID (e.g., \`E301\`).                  | \`"E301"\`                               |
| \`type\`     | string | Must be \`"EXAM"\`.                          | \`"EXAM"\`                               |
| \`subject\`  | string | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, or \`FULL\`.| \`"FULL"\`                               |
| \`title\`    | string | The name of the exam.                      | \`"AITS Mock Test #3"\`                  |
| \`date\`     | string | \`YYYY-MM-DD\` format.                       | \`"2024-08-15"\`                           |
| \`time\`     | string | \`HH:MM\` format.                            | \`"09:00"\`                                |
| \`syllabus\` | string | Comma-separated list of topics.            | \`"Rotational Motion,Thermodynamics"\`   |

**\`exams\` Example:**
\`\`\`json
{
  "id": "E301",
  "type": "EXAM",
  "subject": "FULL",
  "title": "Kota Major Test #1",
  "date": "2024-08-18",
  "time": "07:00",
  "syllabus": "Full Syllabus Paper 1"
}
\`\`\`

---
### 3.3 \`metrics\` Array Items
| Key          | Type   | Description                                       | Example                                  |
|--------------|--------|---------------------------------------------------|------------------------------------------|
| \`type\`       | string | \`"RESULT"\` or \`"WEAKNESS"\`.                       | \`"RESULT"\`                               |
| \`score\`      | string | **For \`RESULT\` only.** "marks/total" format.      | \`"185/300"\`                              |
| \`mistakes\`   | string | **For \`RESULT\` only.** Semicolon-separated.       | \`"Integration;Young's Double Slit"\`      |
| \`weaknesses\` | string | **For \`WEAKNESS\` only.** Semicolon-separated.     | \`"Definite Integration;Wave Optics"\`     |

**\`metrics\` Example:**
\`\`\`json
{
  "type": "RESULT",
  "score": "185/300",
  "mistakes": "Integration by Parts;Young's Double Slit"
}
\`\`\``;

const AIGuide: React.FC = () => {
    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">AI Agent Guide</h2>
            <p className="text-gray-400 mb-6">
                Use the following documentation to instruct a Large Language Model (like Gemini) to generate valid JSON data for batch importing schedules, exams, or student metrics.
            </p>
            <div className="bg-gray-900 p-4 rounded-md border border-gray-600 max-h-[60vh] overflow-y-auto">
                <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{guideText}</pre>
            </div>
        </div>
    );
};

export default AIGuide;