import React from 'react';
import { ExamData } from '../types';
import Icon from './Icon';

interface ExamsViewProps {
    exams: ExamData[];
    onAdd: () => void;
    onEdit: (exam: ExamData) => void;
    onDelete: (examId: string) => void;
}

const ExamsView: React.FC<ExamsViewProps> = ({ exams, onAdd, onEdit, onDelete }) => {
    
    const sortedExams = [...(exams || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const getDaysUntil = (dateStr: string) => {
        const today = new Date();
        today.setHours(0,0,0,0);
        const examDate = new Date(dateStr);
        const diffTime = examDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-lg p-6 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Upcoming Exams</h2>
                <button onClick={onAdd} className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-r from-[var(--accent-color)] to-[var(--gradient-purple)]">
                    <Icon name="plus" /> Add Exam
                </button>
            </div>

            <div className="space-y-4">
                {sortedExams.length > 0 ? sortedExams.map(exam => {
                    const daysUntil = getDaysUntil(exam.date);
                    const isPast = daysUntil < 0;
                    
                    let daysText;
                    if (isPast) daysText = 'Completed';
                    else if (daysUntil === 0) daysText = 'Today!';
                    else if (daysUntil === 1) daysText = 'Tomorrow';
                    else daysText = `${daysUntil} days left`;
                    
                    return (
                        <div key={exam.ID} className={`bg-gray-800/50 rounded-lg border border-gray-700/80 p-4 transition-all group relative ${isPast ? 'opacity-50' : ''}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-300">{exam.subject}</p>
                                    <h3 className="text-lg font-bold text-white mt-1">{exam.title}</h3>
                                    <p className="text-sm text-gray-400 mt-2">Syllabus: {exam.syllabus}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="font-semibold text-white">{new Date(exam.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    <p className="text-sm text-gray-400">{exam.time}</p>
                                    <p className={`mt-2 text-sm font-bold ${daysUntil < 7 && !isPast ? 'text-red-400' : 'text-green-400'}`}>{daysText}</p>
                                </div>
                            </div>
                             <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                <button onClick={() => onEdit(exam)} className="p-1.5 rounded-md bg-gray-900/50 hover:bg-gray-700/50 text-gray-300"><Icon name="edit" className="w-4 h-4" /></button>
                                <button onClick={() => onDelete(exam.ID)} className="p-1.5 rounded-md bg-gray-900/50 hover:bg-gray-700/50 text-red-400"><Icon name="trash" className="w-4 h-4" /></button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center text-gray-500 py-8 border-2 border-dashed border-gray-700 rounded-lg">
                        <p className="font-semibold">No exams scheduled.</p>
                        <p className="text-sm">Click "Add Exam" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExamsView;
