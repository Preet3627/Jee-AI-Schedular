import React, { useState, useEffect } from 'react';
import { ScheduleItem, ScheduleCardData } from '../types';
import Icon from './Icon';

interface CreateEditTaskModalProps {
  task: ScheduleItem | null;
  onClose: () => void;
  onSave: (task: ScheduleItem) => void;
}

const CreateEditTaskModal: React.FC<CreateEditTaskModalProps> = ({ task, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: task ? task.CARD_TITLE.EN : '',
    details: task ? task.FOCUS_DETAIL.EN : '',
    subject: task ? task.SUBJECT_TAG.EN : 'PHYSICS',
    time: task && 'TIME' in task ? task.TIME : '20:00',
    day: task ? task.DAY.EN.toUpperCase() : new Date().toLocaleString('en-us', {weekday: 'long'}).toUpperCase(),
  });
  const [isExiting, setIsExiting] = useState(false);
  const daysOfWeek = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.details || !formData.subject || !formData.time || !formData.day) {
        alert("Please fill out all fields.");
        return;
    }
    
    const isEditing = !!task;

    // Create a new ACTION task, either by converting an existing task or making a new one.
    // This safely handles "upgrading" a HOMEWORK item to a scheduled ACTION item.
    const finalTask: ScheduleCardData = {
        ID: isEditing ? task.ID : `user_${Date.now()}`,
        type: 'ACTION',
        SUB_TYPE: isEditing && 'SUB_TYPE' in task && task.type === 'ACTION' ? task.SUB_TYPE : 'DEEP_DIVE',
        isUserCreated: true, // Any custom edits make it a "user" task
        DAY: { EN: formData.day, GU: "" },
        CARD_TITLE: { EN: formData.title, GU: "" },
        FOCUS_DETAIL: { EN: formData.details, GU: "" },
        SUBJECT_TAG: { EN: formData.subject.toUpperCase(), GU: "" },
        TIME: formData.time,
    };

    onSave(finalTask);
    handleClose();
  };

  const animationClasses = isExiting ? 'modal-exit' : 'modal-enter';
  const contentAnimationClasses = isExiting ? 'modal-content-exit' : 'modal-content-enter';

  return (
    <div className={`fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm ${animationClasses}`} onClick={handleClose}>
      <div className={`w-full max-w-lg bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-xl shadow-2xl p-6 ${contentAnimationClasses}`} onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold text-white mb-4">{task ? 'Edit Task' : 'Create New Task'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-bold text-gray-400">Title</label>
            <input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          </div>
           <div>
            <label className="text-sm font-bold text-gray-400">Details</label>
            <textarea required value={formData.details} onChange={e => setFormData({...formData, details: e.target.value})} className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"></textarea>
          </div>
           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="sm:col-span-2">
                  <label className="text-sm font-bold text-gray-400">Day</label>
                  <select required value={formData.day} onChange={e => setFormData({...formData, day: e.target.value})} className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500">
                     {daysOfWeek.map(d => <option key={d} value={d}>{d.charAt(0) + d.slice(1).toLowerCase()}</option>)}
                  </select>
              </div>
              <div>
                  <label className="text-sm font-bold text-gray-400">Time</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" />
              </div>
           </div>
           <div>
              <label className="text-sm font-bold text-gray-400">Subject Tag</label>
              <input required value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value.toUpperCase()})} className="w-full px-4 py-2 mt-1 text-gray-200 bg-gray-900/50 border border-[var(--glass-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500" placeholder="e.g., PHYSICS, MATHS" />
           </div>
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={handleClose} className="px-5 py-2 text-sm font-semibold rounded-lg bg-gray-700 text-gray-200 hover:bg-gray-600 transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2 text-sm font-semibold rounded-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:opacity-90 transition-opacity">Save Task</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditTaskModal;
