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

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px' }}>Quản Lý Công Việc (Tasks)</h2>
            <form onSubmit={handleCreate} style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <select value={newTask.event_id} onChange={e => setNewTask({...newTask, event_id: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', flex: '1 1 200px' }}>
                    {events.map(ev => <option key={ev.event_id} value={ev.event_id}>{ev.title}</option>)}
                </select>
                <input placeholder="Tên công việc..." value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', flex: '2 1 200px' }} />
                <input type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} required style={{ padding: '10px', borderRadius: '8px', flex: '1 1 150px' }} />
                <button type="submit" style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600' }}>Thêm Task</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map(t => (
                    <div key={t.task_id} style={{ backgroundColor: 'var(--bg-surface)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>{t.title}</strong>
                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Hạn chót: {t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : 'Không có'}</span>
                        </div>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', backgroundColor: t.status === 'DONE' ? '#d1fae5' : '#e5e7eb' }}>{t.status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
export default ManageTasks;