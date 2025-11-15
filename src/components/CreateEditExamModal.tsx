import React, { useState } from 'react';
import { ExamData } from '../types';

interface CreateEditExamModalProps {
  exam: ExamData | null;
  onClose: () => void;
  onSave: (exam: ExamData) => void;
}

const CreateEditExamModal: React.FC<CreateEditExamModalProps> = ({ exam, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    subject: exam ? exam.subject : 'FULL',
    title: exam ? exam.title : '',
    date: exam ? exam.date : new Date().toISOString().split('T')[0],
    time: exam ? exam.time : '09:00',
    syllabus: exam ? exam.syllabus : '',
  });
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.time || !formData.syllabus) {
        alert("Please fill out all fields.");
        return;
    }
    
    const finalExam: ExamData = {
        ID: exam ? exam.ID : `exam_${Date.now()}`,
        title: formData.title,
        date: formData.date,
        time: formData.time,
        syllabus: formData.syllabus,
        subject: formData.subject as 'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'FULL',
    };

    onSave(finalExam);
    handleClose();
  };
  
  const inputClass = "w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500";
  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">{exam ? 'Edit Exam' : 'Add New Exam'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400">Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className={inputClass} placeholder="e.g., AITS Mock Test #4" />
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div>
                  <label className="text-sm font-bold text-gray-400">Subject</label>
                  <select required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value as 'PHYSICS' | 'CHEMISTRY' | 'MATHS' | 'FULL'})} className={inputClass}>
                     <option>FULL</option>
                     <option>PHYSICS</option>
                     <option>CHEMISTRY</option>
                     <option>MATHS</option>
                  </select>
              </div>
              <div>
                  <label className="text-sm font-bold text-gray-400">Date</label>
                  <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className={inputClass} />
              </div>
              <div>
                  <label className="text-sm font-bold text-gray-400">Time</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className={inputClass} />
              </div>
           </div>
           <div>
              <label className="text-sm font-bold text-gray-400">Syllabus</label>
              <textarea required value={formData.syllabus} onChange={e => setFormData({...formData, syllabus: e.target.value})} className={inputClass} placeholder="Comma-separated topics, e.g., Optics, Thermodynamics..."></textarea>
           </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">Save Exam</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditExamModal;
