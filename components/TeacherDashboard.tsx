import React, { useState } from 'react';
import { StudentData, ScheduleItem, HomeworkData, ScheduleCardData } from '../types';
import Icon from './Icon';
import AIGuide from './AIGuide';
import MessagingModal from './MessagingModal';
import CreateEditTaskModal from './CreateEditTaskModal';
import AIParserModal from './AIParserModal';
import { api } from '../api/apiService';

interface TeacherDashboardProps {
    students: StudentData[];
    onToggleUnacademySub: (sid: string) => void;
    onDeleteUser: (sid: string) => void;
    onAddTeacher?: (teacherData: any) => void;
    onBroadcastTask: (task: ScheduleItem) => void;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ students, onToggleUnacademySub, onDeleteUser, onAddTeacher, onBroadcastTask }) => {
    const [activeTab, setActiveTab] = useState<'grid' | 'broadcast' | 'guide'>('grid');
    const [messagingStudent, setMessagingStudent] = useState<StudentData | null>(null);
    const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
    const [isAIBroadcastModalOpen, setIsAIBroadcastModalOpen] = useState(false);

    const TabButton: React.FC<{ tabId: string; children: React.ReactNode; }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId as any)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-cyan-400 border-cyan-400' : 'text-gray-400 border-transparent hover:text-white'}`}
        >
            {children}
        </button>
    );

    const handleBroadcastSave = (task: ScheduleItem) => {
        const taskWithUniqueId = { ...task, ID: `${task.type.charAt(0)}${Date.now()}` };
        if (window.confirm(`Are you sure you want to send this task to all ${students.length} students?`)) {
            onBroadcastTask(taskWithUniqueId);
        }
    };
    
    const handleAIBroadcastSave = (data: any) => {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error("Received invalid data format from AI.");
            }
            
            const createLocalizedString = (text: string) => ({ EN: text || '', GU: '' });

            const schedules = Array.isArray(data.schedules) ? data.schedules : [];

            const tasksToBroadcast: ScheduleItem[] = schedules.map((s: any): ScheduleItem | null => {
                // Basic validation for a schedule item
                if (!s || !s.id || !s.type || !s.day || !s.title || !s.detail || !s.subject) {
                    console.warn("Skipping invalid schedule item from AI:", s);
                    return null;
                }

                if (s.type === 'HOMEWORK') {
                    return {
                        ID: s.id, type: 'HOMEWORK', isUserCreated: true, DAY: createLocalizedString(s.day),
                        CARD_TITLE: createLocalizedString(s.title), FOCUS_DETAIL: createLocalizedString(s.detail),
                        SUBJECT_TAG: createLocalizedString(s.subject?.toUpperCase()), Q_RANGES: s.q_ranges || '', TIME: s.time || undefined
                    } as HomeworkData;
                } else if (s.type === 'ACTION') {
                     if (!s.time) {
                        console.warn("Skipping ACTION item without a time:", s);
                        return null; // ACTION type requires a TIME
                     }
                    return {
                        ID: s.id, type: 'ACTION', SUB_TYPE: s.sub_type || 'DEEP_DIVE', isUserCreated: true,
                        DAY: createLocalizedString(s.day), TIME: s.time, CARD_TITLE: createLocalizedString(s.title),
                        FOCUS_DETAIL: createLocalizedString(s.detail), SUBJECT_TAG: createLocalizedString(s.subject?.toUpperCase())
                    } as ScheduleCardData;
                }
                
                console.warn("Skipping unknown schedule type from AI:", s);
                return null;

            }).filter((item): item is ScheduleItem => item !== null);

            if (tasksToBroadcast.length === 0) {
                alert("No valid schedule items were found in the provided data to broadcast.");
                return;
            }

            if(window.confirm(`This will broadcast ${tasksToBroadcast.length} tasks to all students. Continue?`)) {
                tasksToBroadcast.forEach(onBroadcastTask);
                setIsAIBroadcastModalOpen(false);
            }
        } catch (error: any) {
            alert(`Error processing data: ${error.message}`);
        }
    };
    
    const handleClearData = async (student: StudentData) => {
        const confirmation = window.prompt(`This will reset all data (schedules, results, config) for ${student.fullName} (${student.sid}). This cannot be undone. To confirm, type the student's ID:`);
        if (confirmation === student.sid) {
            try {
                await api.clearStudentData(student.sid);
                alert(`Successfully cleared all data for ${student.fullName}.`);
            } catch (error: any) {
                alert(`Failed to clear data: ${error.message}`);
            }
        } else if (confirmation !== null) {
            alert("Confirmation failed. Student ID did not match.");
        }
    };


    return (
        <main className="mt-8">
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    <TabButton tabId="grid"><div className="flex items-center gap-2"><Icon name="users" /> Student Grid</div></TabButton>
                    <TabButton tabId="broadcast"><div className="flex items-center gap-2"><Icon name="send" /> Broadcast</div></TabButton>
                    <TabButton tabId="guide"><div className="flex items-center gap-2"><Icon name="book-open" /> AI Guide</div></TabButton>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'grid' && <StudentGrid students={students} onToggleSub={onToggleUnacademySub} onDeleteUser={onDeleteUser} onStartMessage={setMessagingStudent} onClearData={handleClearData} />}
                {activeTab === 'broadcast' && <BroadcastManager onOpenModal={() => setIsBroadcastModalOpen(true)} onOpenAIModal={() => setIsAIBroadcastModalOpen(true)} />}
                {activeTab === 'guide' && <AIGuide />}
            </div>

            {messagingStudent && (
                <MessagingModal student={messagingStudent} onClose={() => setMessagingStudent(null)} isDemoMode={false} />
            )}
            {isBroadcastModalOpen && (
                <CreateEditTaskModal task={null} onClose={() => setIsBroadcastModalOpen(false)} onSave={handleBroadcastSave} decks={[]} />
            )}
            {isAIBroadcastModalOpen && (
                <AIParserModal onClose={() => setIsAIBroadcastModalOpen(false)} onDataReady={handleAIBroadcastSave} />
            )}
        </main>
    );
};

const StudentGrid: React.FC<{ students: StudentData[], onToggleSub: (sid: string) => void, onDeleteUser: (sid: string) => void, onStartMessage: (student: StudentData) => void, onClearData: (student: StudentData) => void }> = ({ students, onToggleSub, onDeleteUser, onStartMessage, onClearData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {students.map(student => (
            <div key={student.sid} className="bg-gray-800/70 p-4 rounded-lg border border-gray-700">
                 <div className="flex items-center gap-3 mb-3">
                    <img src={student.profilePhoto} alt={student.fullName} className="w-12 h-12 rounded-full object-cover" />
                    <div>
                       <h3 className="font-bold text-white">{student.fullName}</h3>
                       <p className="text-sm text-gray-400">{student.sid}</p>
                    </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                     <button onClick={() => onStartMessage(student)} className="w-full flex items-center justify-center gap-2 bg-cyan-800 hover:bg-cyan-700 text-white text-xs font-semibold py-1.5 px-3 rounded"><Icon name="message" className="w-3.5 h-3.5"/> Message</button>
                    <button onClick={() => onClearData(student)} className="w-full bg-yellow-800 hover:bg-yellow-700 text-white text-xs font-semibold py-1.5 px-3 rounded">Clear Data</button>
                    <button onClick={() => onDeleteUser(student.sid)} className="w-full col-span-2 bg-red-800 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded">Delete User</button>
                </div>
            </div>
        ))}
    </div>
);

const BroadcastManager: React.FC<{ onOpenModal: () => void, onOpenAIModal: () => void }> = ({ onOpenModal, onOpenAIModal }) => (
    <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-2xl mx-auto text-center">
        <Icon name="send" className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
        <h3 className="font-bold text-white text-lg mb-2">Broadcast a Task</h3>
        <p className="text-sm text-gray-400 mb-4">Create a task and send it to every student. It will appear in their schedule and sync to their Google Calendar. Use the AI Parser for batch broadcasting.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={onOpenModal} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gray-700 hover:bg-gray-600">
                <Icon name="plus" /> Create Manually
            </button>
            <button onClick={onOpenAIModal} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]">
                <Icon name="upload" /> Broadcast from AI
            </button>
        </div>
    </div>
);

export default TeacherDashboard;