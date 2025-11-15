import React, { useState } from 'react';
import Icon from './Icon';

const AIGuide: React.FC = () => {
    const codeBlockClass = "relative p-3 bg-gray-900 rounded-md font-mono text-sm text-cyan-300 overflow-x-auto";

    const CodeBlock: React.FC<{ children: string }> = ({ children }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
            navigator.clipboard.writeText(children);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        return (
            <div className={codeBlockClass}>
                <button onClick={handleCopy} className="absolute top-2 right-2 p-1.5 bg-gray-700/50 rounded-md hover:bg-gray-600/50">
                    {copied ? <Icon name="check" className="w-4 h-4 text-green-400" /> : <Icon name="copy" className="w-4 h-4 text-gray-400" />}
                </button>
                <pre><code className="whitespace-pre-wrap">{children}</code></pre>
            </div>
        );
    };

    return (
        <div className="space-y-8 text-gray-300">
             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
                 <h2 className="text-2xl font-bold text-white mb-2">Advanced AI Prompting Guide</h2>
                 <p className="mb-6">Use this guide to get structured data from an AI like Gemini. Copy the AI's output and paste it into our "Import from Text/CSL" parser.</p>
             </div>

            <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
                 <h3 className="text-xl font-bold text-white mb-4">1. Generating a Weekly Student Schedule</h3>
                 <p className="mb-4">Provide student details and constraints to create a schedule. The AI will generate a table that you can paste directly into the AI Parser.</p>
                 <h4 className="text-lg font-semibold text-cyan-400 mb-2">Example Prompt:</h4>
                 <CodeBlock>
{`You are an expert academic scheduler for JEE aspirants.

Generate a schedule table for Rohan (SID: S001). His main weakness is "Organic Chemistry".

Constraints:
1. Schedule tasks between 17:00 and 23:30 from Monday to Saturday.
2. Sunday is for review. Schedule a mock test analysis session.
3. Include two "DEEP_DIVE" sessions for Organic Chemistry.
4. Add a "HOMEWORK" task for Physics with questions from NCERT Chapter 5, exercises 10-20.

Required Columns:
ID, SID, TYPE, DAY, TIME, CARD_TITLE, FOCUS_DETAIL, SUBJECT_TAG, Q_RANGES, SUB_TYPE`}
                 </CodeBlock>
             </div>

             <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
                 <h3 className="text-xl font-bold text-white mb-4">2. Generating Upcoming Exams</h3>
                 <p className="mb-4">Use this format to quickly add multiple exams to the tracker.</p>
                 <h4 className="text-lg font-semibold text-cyan-400 mb-2">Example Prompt:</h4>
                 <CodeBlock>
{`Generate a CSV table for adding exams for student S002.

Exam 1:
- Title: AITS Mock Test #4
- Subject: FULL
- Date & Time: August 25, 2024 at 09:00
- Syllabus: Full Syllabus Paper 1

Exam 2:
- Title: Organic Chemistry Test
- Subject: CHEMISTRY
- Date & Time: September 2, 2024 at 14:00
- Syllabus: "Hydrocarbons, Aldehydes & Ketones"

Required Columns:
ID,SID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS`}
                 </CodeBlock>
                 <h4 className="text-lg font-semibold text-cyan-400 mt-4 mb-2">Expected AI Output:</h4>
                  <CodeBlock>
{`ID,SID,TYPE,SUBJECT,TITLE,DATE,TIME,SYLLABUS
E303,S002,EXAM,FULL,"AITS Mock Test #4",2024-08-25,09:00,"Full Syllabus Paper 1"
E304,S002,EXAM,CHEMISTRY,"Organic Chemistry Test",2024-09-02,14:00,"Hydrocarbons,Aldehydes & Ketones"`}
                 </CodeBlock>
            </div>
        </div>
    );
};

export default AIGuide;
