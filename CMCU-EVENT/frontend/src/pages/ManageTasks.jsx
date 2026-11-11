import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function ManageTasks() {
    const { user } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [newTask, setNewTask] = useState({ event_id: '', title: '', deadline: '' });

    const fetchTasks = async () => {
        try {
            const res = await apiClient.get(`/admin/tasks?admin_user_id=${user?.user_id}`);
            if (res.data.success) setTasks(res.data.data);
        } catch (error) { console.error(error); }
    };

    const fetchEvents = async () => {
        try {
            const res = await apiClient.get('/events');
            if (res.data.success) {
                setEvents(res.data.data);
                if (res.data.data.length > 0) setNewTask(prev => ({ ...prev, event_id: res.data.data[0].event_id }));
            }
        } catch (error) { console.error(error); }
    };

    useEffect(() => { 
        if (user) { fetchTasks(); fetchEvents(); }
    }, [user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTask.event_id) return alert("Vui lòng chọn sự kiện!");
        try {
            await apiClient.post('/admin/tasks', { 
                ...newTask, 
                admin_user_id: user?.user_id,
                assignee_id: user?.user_id 
            });
            setNewTask({ event_id: newTask.event_id, title: '', deadline: '' });
            fetchTasks(); 
        } catch (error) {
            alert('Lỗi tạo task: ' + (error.response?.data?.message || error.message));
        }
    };

    // Hàm render Icon và Class cho trạng thái
    const renderStatus = (status) => {
        if (status === 'DONE') return { text: '✅ Hoàn thành', badgeClass: 'badge-done', cardClass: 'status-done' };
        if (status === 'IN_PROGRESS') return { text: '⏳ Đang làm', badgeClass: 'badge-in-progress', cardClass: 'status-in-progress' };
        return { text: '📝 Cần làm', badgeClass: 'badge-todo', cardClass: '' }; // TODO
    };

    return (
        <div className="manage-tasks-container">
            <h2 className="page-title">Quản Lý Công Việc</h2>
            
            {/* FORM THÊM TASK */}
            <div className="task-form-wrapper">
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Thuộc sự kiện</label>
                        <select className="form-input" value={newTask.event_id} onChange={e => setNewTask({...newTask, event_id: e.target.value})} required>
                            {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}
                        </select>
                    </div>

                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                        <label className="form-label">Tên công việc</label>
                        <input className="form-input" placeholder="Nhập tên công việc..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Hạn chót</label>
                        <input className="form-input" type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} required />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <button type="submit" className="btn-create-submit" style={{ marginTop: 0 }}>
                            ➕ Thêm Task
                        </button>
                    </div>
                </form>
            </div>

            {/* DANH SÁCH TASKS */}
            <div className="task-list">
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#64748B', background: '#FFFFFF', borderRadius: '16px' }}>
                        Chưa có công việc nào. Hãy tạo task mới!
                    </div>
                ) : (
                    tasks.map((t, index) => {
                        const statusInfo = renderStatus(t.status);
                        return (
                            <div 
                                key={t.task_id} 
                                className={`task-card ${statusInfo.cardClass}`}
                                style={{ animationDelay: `${index * 0.1}s` }}
                            >
                                <div>
                                    <span className="task-title">{t.title}</span>
                                    <span className="task-deadline">
                                        🕒 Hạn chót: {t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : 'Không có'}
                                    </span>
                                </div>
                                <span className={`status-badge ${statusInfo.badgeClass}`}>
                                    {statusInfo.text}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
export default ManageTasks;