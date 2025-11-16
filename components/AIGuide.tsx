import React from 'react';

const guideText = `# Universal Data Documentation for AI Agents (JEE Scheduler Pro)
# Version: 5.5.0 (JSON Only)
# Purpose: To guide AI agents in generating structured JSON data for the JEE Scheduler Pro platform.

## 1. CRITICAL AI BEHAVIOR: Output Raw JSON ONLY
Your entire response **MUST** be a single, raw JSON object.
- **DO NOT** include any explanations, conversational text, or markdown formatting like \`\`\`json.
- Your output will be parsed directly by a machine.

## 2. INTERACTION & DATA GATHERING
- **DO NOT INVENT DATA:** If the user's request is vague, you **MUST** ask for clarification.
- **ASK FOR DETAILS:** For schedules, ask for timetables, exam dates, syllabus, and weak topics.
- **Example with Answer Key:** "Create a homework for JEE Mains 2023 Jan 29 Shift 1 paper and find its official answer key."

## 3. Top-Level JSON Structure (for User Import)
Your entire output must be a single JSON object with these keys. Provide empty arrays \`[]\` for types not present.
\`\`\`json
{
  "schedules": [ /* ... */ ],
  "exams": [ /* ... */ ],
  "metrics": [ /* ... */ ]
}
\`\`\`

---
### 4.1 \`schedules\` Array Items
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
| \`answers\`   | object | **For \`HOMEWORK\` only.** Optional. If asked, you MUST generate this. Maps question numbers to answers, e.g., \`{"1": "A", "2": "C", "76": "12.50"}\`. | \`{"1": "A", "2": "D"}\` |

---
### 4.2 \`exams\` Array Items
| Key        | Type   | Description                                | Example                                |
|------------|--------|--------------------------------------------|----------------------------------------|
| \`id\`       | string | Unique ID (e.g., \`E301\`).                  | \`"E301"\`                               |
| \`type\`     | string | Must be \`"EXAM"\`.                          | \`"EXAM"\`                               |
| \`subject\`  | string | \`PHYSICS\`, \`CHEMISTRY\`, \`MATHS\`, or \`FULL\`.| \`"FULL"\`                               |
| \`title\`    | string | The name of the exam.                      | \`"AITS Mock Test #3"\`                  |
| \`date\`     | string | \`YYYY-MM-DD\` format.                       | \`"2024-08-15"\`                           |
| \`time\`     | string | \`HH:MM\` format.                            | \`"09:00"\`                                |
| \`syllabus\` | string | Comma-separated list of topics.            | \`"Rotational Motion,Thermodynamics"\`   |

---
### 4.3 \`metrics\` Array Items
| Key          | Type   | Description                                       | Example                                  |
|--------------|--------|---------------------------------------------------|------------------------------------------|
| \`type\`       | string | \`"RESULT"\` or \`"WEAKNESS"\`.                       | \`"RESULT"\`                               |
| \`score\`      | string | **For \`RESULT\` only.** "marks/total" format.      | \`"185/300"\`                              |
| \`mistakes\`   | string | **For \`RESULT\` only.** Semicolon-separated.       | \`"Integration;Young's Double Slit"\`      |
| \`weaknesses\` | string | **For \`WEAKNESS\` only.** Semicolon-separated.     | \`"Definite Integration;Wave Optics"\`     |

---
## 5. Additional Schemas (for specific AI features)
### 5.1 \`practice_test\` Object
- **Purpose:** To generate a complete practice test on a given topic.
- **Top-level keys:** \`questions\`, \`answers\`.

#### 5.1.1 \`questions\` Array Items
| Key       | Type          | Description                             | Example                                      |
|-----------|---------------|-----------------------------------------|----------------------------------------------|
| \`number\`  | number        | The question number, starting from 1.   | \`1\`                                          |
| \`text\`    | string        | The full question text.                 | \`"What is the capital of France?"\`            |
| \`options\` | array[string] | An array of 4 string options.           | \`["(A) Berlin", "(B) Madrid", "(C) Paris"]\`   |

#### 5.1.2 \`answers\` Object
- A JSON object mapping the question number (as a string) to the correct option letter (A, B, C, or D).
- **Example:** \`{"1": "C"}\`
`;

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