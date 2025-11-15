

import React, { useState } from 'react';
import { StudentData } from '../types';
import Icon from './Icon';
import AIGuide from './AIGuide';
import MessagingModal from './MessagingModal';

interface TeacherDashboardProps {
    students: StudentData[];
    onToggleUnacademySub: (sid: string) => void;
    onDeleteUser: (sid: string) => void;
    onAddTeacher?: (teacherData: any) => void;
    onBatchImport: (csl: string) => void;
    isDemoMode: boolean;
}

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ students, onToggleUnacademySub, onDeleteUser, onAddTeacher, onBatchImport, isDemoMode }) => {
    const [activeTab, setActiveTab] = useState<'grid' | 'import' | 'access' | 'csl'>('grid');
    const [messagingStudent, setMessagingStudent] = useState<StudentData | null>(null);

    const TabButton: React.FC<{ tabId: 'grid' | 'import' | 'access' | 'csl'; children: React.ReactNode; }> = ({ tabId, children }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors border-b-2 ${activeTab === tabId ? 'text-cyan-400 border-cyan-400' : 'text-gray-400 border-transparent hover:text-white'}`}
        >
            {children}
        </button>
    );
    
    const handleCloseModal = () => {
        setMessagingStudent(null);
    };

    return (
        <main className="mt-8">
            <div className="border-b border-gray-700">
                <nav className="-mb-px flex space-x-6">
                    <TabButton tabId="grid"><div className="flex items-center gap-2"><Icon name="users" /> Student Grid</div></TabButton>
                    <TabButton tabId="import"><div className="flex items-center gap-2"><Icon name="upload" /> CSL Import</div></TabButton>
                    <TabButton tabId="access"><div className="flex items-center gap-2"><Icon name="user-plus" /> Manage Access</div></TabButton>
                    <TabButton tabId="csl"><div className="flex items-center gap-2">#CSL Guide</div></TabButton>
                </nav>
            </div>
            <div className="mt-6">
                {activeTab === 'grid' && <StudentGrid students={students} onToggleSub={onToggleUnacademySub} onDeleteUser={onDeleteUser} onStartMessage={setMessagingStudent} isDemoMode={isDemoMode} />}
                {activeTab === 'import' && <CSLBatchImport onImport={onBatchImport} isDemoMode={isDemoMode} />}
                {activeTab === 'access' && <AccessManager onAddTeacher={onAddTeacher} isDemoMode={isDemoMode} />}
                {activeTab === 'csl' && <AIGuide />}
            </div>

            {messagingStudent && (
                <MessagingModal
                    student={messagingStudent}
                    onClose={handleCloseModal}
                    isDemoMode={isDemoMode}
                />
            )}
        </main>
    );
};

const StudentGrid: React.FC<{ students: StudentData[], onToggleSub: (sid: string) => void, onDeleteUser: (sid: string) => void, onStartMessage: (student: StudentData) => void, isDemoMode: boolean }> = ({ students, onToggleSub, onDeleteUser, onStartMessage, isDemoMode }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {students.map(student => (
                <div key={student.CONFIG.SID} className="bg-gray-800/70 p-4 rounded-lg border border-gray-700 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                        <img src={student.CONFIG.profilePhoto} alt={student.CONFIG.fullName} className="w-12 h-12 rounded-full object-cover" />
                        <div>
                           <h3 className="font-bold text-white">{student.CONFIG.fullName}</h3>
                           <p className="text-sm text-gray-400">{student.CONFIG.SID}</p>
                        </div>
                    </div>
                    <div className="flex-grow space-y-1">
                        <p className="text-sm text-gray-300">Score: <span className="font-semibold text-cyan-400">{student.CONFIG.SCORE}</span></p>
                        <p className="text-sm text-gray-300">Weaknesses: {student.CONFIG.WEAK.slice(0, 2).join(', ')}</p>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                         <button 
                            onClick={() => onStartMessage(student)}
                            disabled={isDemoMode}
                            className="w-full flex items-center justify-center gap-2 bg-cyan-800 hover:bg-cyan-700 text-white text-xs font-semibold py-1.5 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                           <Icon name="message" className="w-3.5 h-3.5"/> Message
                        </button>
                        <button 
                            onClick={() => onDeleteUser(student.CONFIG.SID)}
                            disabled={isDemoMode}
                            className="w-full bg-red-800 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete
                        </button>
                         <button 
                            onClick={() => onToggleSub(student.CONFIG.SID)}
                            disabled={isDemoMode}
                            className={`col-span-2 w-full px-3 py-1.5 text-xs font-semibold rounded ${student.CONFIG.UNACADEMY_SUB ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'} disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {student.CONFIG.UNACADEMY_SUB ? 'Subscribed' : 'Not Subscribed'}
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

const CSLBatchImport: React.FC<{ onImport: (csl: string) => void, isDemoMode: boolean }> = ({ onImport, isDemoMode }) => {
    const [cslText, setCslText] = useState('');
    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-2xl mx-auto">
            <h3 className="font-bold text-white text-lg mb-4">Paste CSL to Import</h3>
            <p className="text-sm text-gray-400 mb-4">Paste a CSL block here. The system will parse and assign all ACTION and HOMEWORK items to the correct students based on their SIDs.</p>
            <form onSubmit={(e) => { e.preventDefault(); onImport(cslText); setCslText(''); }}>
                <textarea 
                    value={cslText}
                    onChange={(e) => setCslText(e.target.value)}
                    disabled={isDemoMode} 
                    className="w-full h-64 bg-gray-900 border border-gray-600 rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    placeholder="## CSL_SCHEDULE_V2.1_BEGIN ##&#10;HOMEWORK | ID=H002, SID=S001, ...&#10;ACTION | ID=A005, SID=S002, ...&#10;## CSL_SCHEDULE_V2.1_END ##"
                />
                 <button type="submit" disabled={!cslText || isDemoMode} className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]">
                    <Icon name="upload" /> Import Schedule
                </button>
                 {isDemoMode && <p className="text-xs text-center mt-2 text-yellow-400">Batch import is disabled in Demo Mode.</p>}
            </form>
        </div>
    );
};

const AccessManager: React.FC<{ onAddTeacher?: (teacherData: any) => void, isDemoMode: boolean }> = ({ onAddTeacher, isDemoMode }) => {
    const [fullName, setFullName] = useState('');
    const [sid, setSid] = useState('');
    const [password, setPassword] = useState('');

    return (
        <div className="bg-gray-800/70 p-6 rounded-lg border border-gray-700 max-w-md mx-auto">
            <h3 className="font-bold text-white text-lg mb-4">Add New Teacher/Admin</h3>
            <form onSubmit={e => { e.preventDefault(); onAddTeacher && onAddTeacher({ fullName, sid, password }); }} className="space-y-4">
                 <div>
                    <label className="text-sm font-bold text-gray-400">Full Name</label>
                    <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} disabled={isDemoMode} className="w-full px-4 py-3 mt-1 text-gray-200 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
                </div>
                 <div>
                    <label className="text-sm font-bold text-gray-400">Admin ID</label>
                    <input type="text" value={sid} onChange={e => setSid(e.target.value)} disabled={isDemoMode} className="w-full px-4 py-3 mt-1 text-gray-200 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
                </div>
                 <div>
                    <label className="text-sm font-bold text-gray-400">Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} disabled={isDemoMode} className="w-full px-4 py-3 mt-1 text-gray-200 bg-gray-900/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50" />
                </div>
                 <button type="submit" disabled={isDemoMode} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-semibold text-white rounded-lg transition-transform hover:scale-105 active:scale-100 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-[var(--gradient-cyan)] to-[var(--gradient-purple)]">
                    <Icon name="user-plus" /> Create Admin
                </button>
            </form>
        </div>
    )
}

export default TeacherDashboard;