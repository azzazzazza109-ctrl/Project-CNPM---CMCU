import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function parseTaskNote(rawNote) {
    if (!rawNote) return { description: '', checklist: [], staff_note: '', submitted_for_check: false };
    try {
        const parsed = JSON.parse(rawNote);
        return {
            description: parsed.description || '',
            checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
            staff_note: parsed.staff_note || '',
            submitted_for_check: Boolean(parsed.submitted_for_check)
        };
    } catch {
        return { description: String(rawNote), checklist: [], staff_note: '', submitted_for_check: false };
    }
}

function ManageTasks() {
    const { user } = useAuth();
    const isAdmin = user?.system_role === 'ADMIN';

    const [tasks, setTasks] = useState([]);
    const [events, setEvents] = useState([]);
    const [filterEventId, setFilterEventId] = useState('ALL');
    const [expandedTaskId, setExpandedTaskId] = useState(null);

    const [newTask, setNewTask] = useState({
        event_id: '',
        title: '',
        deadline: '',
        description: '',
        checklistText: ''
    });

    const [draftProgress, setDraftProgress] = useState({});

    const fetchTasks = async () => {
        try {
            const res = await apiClient.get(`/admin/tasks?admin_user_id=${user?.user_id}`);
            if (res.data.success) setTasks(res.data.data || []);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await apiClient.get('/events');
            if (res.data.success) {
                const list = res.data.data || [];
                setEvents(list);
                if (list.length > 0) {
                    setNewTask(prev => ({ ...prev, event_id: prev.event_id || list[0].event_id }));
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchTasks();
            fetchEvents();
        }
    }, [user]);

    // Admin: Thêm Task mới
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newTask.event_id) return alert('Vui lòng chọn sự kiện!');

        const checklistItems = newTask.checklistText
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .map((text, index) => ({
                id: index + 1,
                text,
                done: false
            }));

        try {
            await apiClient.post('/admin/tasks', {
                event_id: newTask.event_id,
                title: newTask.title,
                deadline: newTask.deadline,
                description: newTask.description,
                checklist: checklistItems,
                admin_user_id: user?.user_id,
                assignee_id: user?.user_id
            });
            setNewTask({
                event_id: newTask.event_id,
                title: '',
                deadline: '',
                description: '',
                checklistText: ''
            });
            fetchTasks();
        } catch (error) {
            alert('Lỗi tạo task: ' + (error.response?.data?.message || error.message));
        }
    };

    // Admin: Xoá Task
    const handleDeleteTask = async (e, taskId, taskTitle) => {
        e.stopPropagation(); // Không làm bung/đóng thẻ khi bấm nút Xoá
        if (!window.confirm(`Bạn có chắc chắn muốn xoá công việc "${taskTitle}" không?`)) return;

        try {
            await apiClient.delete(`/admin/tasks/${taskId}?admin_user_id=${user?.user_id}`);
            setTasks(prev => prev.filter(t => t.task_id !== taskId));
            if (expandedTaskId === taskId) setExpandedTaskId(null);
        } catch (error) {
            alert('Lỗi xoá task: ' + (error.response?.data?.message || error.message));
        }
    };

    // Bấm vào Task để xem chi tiết đầu việc
    const handleToggleExpand = (task) => {
        if (expandedTaskId === task.task_id) {
            setExpandedTaskId(null);
            return;
        }
        const parsed = parseTaskNote(task.note);
        setDraftProgress(prev => ({
            ...prev,
            [task.task_id]: {
                description: parsed.description,
                checklist: parsed.checklist,
                staff_note: parsed.staff_note,
                submitted_for_check: parsed.submitted_for_check
            }
        }));
        setExpandedTaskId(task.task_id);
    };

    // Staff/Admin tick chọn từng hạng mục công việc nhỏ
    const handleCheckItem = (taskId, itemId) => {
        setDraftProgress(prev => {
            const current = prev[taskId] || { checklist: [] };
            const updatedChecklist = current.checklist.map(item =>
                item.id === itemId ? { ...item, done: !item.done } : item
            );
            return {
                ...prev,
                [taskId]: { ...current, checklist: updatedChecklist }
            };
        });
    };

    // Staff gửi báo cáo tiến độ cho Admin kiểm tra
    const handleSubmitProgressToAdmin = async (task) => {
        const currentDraft = draftProgress[task.task_id] || parseTaskNote(task.note);
        const total = currentDraft.checklist.length;
        const doneCount = currentDraft.checklist.filter(i => i.done).length;
        const nextStatus = doneCount > 0 || currentDraft.staff_note ? 'IN_PROGRESS' : 'TODO';

        try {
            await apiClient.patch(`/admin/tasks/${task.task_id}`, {
                user_id: user?.user_id,
                status: nextStatus,
                description: currentDraft.description,
                checklist: currentDraft.checklist,
                staff_note: currentDraft.staff_note,
                submitted_for_check: true
            });
            alert(`Đã gửi tiến độ (${doneCount}/${total} mục) cho Admin kiểm tra!`);
            fetchTasks();
        } catch (error) {
            alert('Lỗi gửi tiến độ: ' + (error.response?.data?.message || error.message));
        }
    };

    // Admin duyệt Hoàn thành (DONE) hoặc yêu cầu làm lại (IN_PROGRESS)
    const handleAdminVerifyStatus = async (task, newStatus) => {
        const currentDraft = draftProgress[task.task_id] || parseTaskNote(task.note);
        try {
            await apiClient.patch(`/admin/tasks/${task.task_id}`, {
                user_id: user?.user_id,
                status: newStatus,
                description: currentDraft.description,
                checklist: currentDraft.checklist,
                staff_note: currentDraft.staff_note,
                submitted_for_check: newStatus === 'DONE'
            });
            fetchTasks();
        } catch (error) {
            alert('Lỗi cập nhật trạng thái: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredTasks = tasks.filter(t =>
        filterEventId === 'ALL' ? true : String(t.event_id) === String(filterEventId)
    );

    return (
        <div style={{ maxWidth: '880px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '8px' }}>
                {isAdmin ? 'Quản Lý Công Việc (Tasks)' : 'Đầu Việc Trong Các Sự Kiện (Staff)'}
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
                {isAdmin
                    ? 'Admin có thể thêm, xoá công việc, giao danh sách hạng mục chi tiết và duyệt báo cáo từ Staff.'
                    : 'Bấm vào từng đầu việc để xem các mục cần làm, tick chọn tiến độ và gửi cho Admin kiểm tra.'}
            </p>

            {/* FORM THÊM TASK MỚI (CHỈ DÀNH CHO ADMIN) */}
            {isAdmin && (
                <form
                    onSubmit={handleCreate}
                    style={{
                        backgroundColor: 'var(--bg-surface)',
                        padding: '24px',
                        borderRadius: '12px',
                        marginBottom: '28px',
                        border: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <select
                            value={newTask.event_id}
                            onChange={e => setNewTask({ ...newTask, event_id: e.target.value })}
                            required
                            style={{ padding: '10px', borderRadius: '8px', flex: '1 1 200px' }}
                        >
                            {events.map(ev => (
                                <option key={ev.event_id} value={ev.event_id}>
                                    {ev.title}
                                </option>
                            ))}
                        </select>
                        <input
                            placeholder="Tên công việc chính..."
                            value={newTask.title}
                            onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            required
                            style={{ padding: '10px', borderRadius: '8px', flex: '2 1 200px' }}
                        />
                        <input
                            type="datetime-local"
                            value={newTask.deadline}
                            onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                            required
                            style={{ padding: '10px', borderRadius: '8px', flex: '1 1 160px' }}
                        />
                    </div>

                    <input
                        placeholder="Mô tả chi tiết công việc cho Staff..."
                        value={newTask.description}
                        onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                        style={{ padding: '10px', borderRadius: '8px', width: '100%' }}
                    />

                    <textarea
                        rows={3}
                        placeholder={'Nhập các mục việc cụ thể để Staff tick chọn tiến độ (mỗi dòng 1 mục):\nChuẩn bị bàn lễ tân và danh sách SV\nKiểm tra thiết bị quét mã QR\nBố trí standee trước cửa hội trường'}
                        value={newTask.checklistText}
                        onChange={e => setNewTask({ ...newTask, checklistText: e.target.value })}
                        style={{ padding: '10px', borderRadius: '8px', width: '100%', fontFamily: 'inherit' }}
                    />

                    <div>
                        <button
                            type="submit"
                            style={{
                                padding: '10px 20px',
                                background: 'var(--primary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            + Thêm Task
                        </button>
                    </div>
                </form>
            )}

            {/* BỘ LỌC THEO SỰ KIỆN */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                <strong>Danh sách đầu việc ({filteredTasks.length})</strong>
                <select
                    value={filterEventId}
                    onChange={e => setFilterEventId(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px' }}
                >
                    <option value="ALL">-- Tất cả sự kiện --</option>
                    {events.map(ev => (
                        <option key={ev.event_id} value={ev.event_id}>
                            {ev.title}
                        </option>
                    ))}
                </select>
            </div>

            {/* DANH SÁCH CÔNG VIỆC */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredTasks.map(t => {
                    const parsed = draftProgress[t.task_id] || parseTaskNote(t.note);
                    const totalItems = parsed.checklist.length;
                    const completedItems = parsed.checklist.filter(i => i.done).length;
                    const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : (t.status === 'DONE' ? 100 : 0);
                    const isExpanded = expandedTaskId === t.task_id;
                    const eventName = t.event_title || events.find(e => Number(e.event_id) === Number(t.event_id))?.title || `Sự kiện #${t.event_id}`;

                    return (
                        <div
                            key={t.task_id}
                            style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: '8px',
                                border: '1px solid var(--border-color)',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Thanh tiêu đề Task (Bấm vào để mở xem chi tiết) */}
                            <div
                                onClick={() => handleToggleExpand(t)}
                                style={{
                                    padding: '16px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                                        [{eventName}]
                                    </span>
                                    <strong style={{ display: 'block', margin: '4px 0', fontSize: '1.05rem' }}>
                                        {t.title}
                                    </strong>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        Hạn chót: {t.deadline ? new Date(t.deadline).toLocaleString('vi-VN') : 'Không có'}
                                        {totalItems > 0 && ` • Tiến độ: ${completedItems}/${totalItems} mục (${percent}%)`}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {parsed.submitted_for_check && t.status !== 'DONE' && (
                                        <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', backgroundColor: '#fef3c7', color: '#92400e', fontWeight: '600' }}>
                                            Chờ Admin check
                                        </span>
                                    )}
                                    <span
                                        style={{
                                            padding: '4px 12px',
                                            borderRadius: '20px',
                                            fontSize: '0.8rem',
                                            fontWeight: '600',
                                            backgroundColor:
                                                t.status === 'DONE'
                                                    ? '#d1fae5'
                                                    : t.status === 'IN_PROGRESS'
                                                    ? '#dbeafe'
                                                    : '#e5e7eb'
                                        }}
                                    >
                                        {t.status}
                                    </span>

                                    {/* NÚT XOÁ TASK DÀNH RIÊNG CHO ADMIN */}
                                    {isAdmin && (
                                        <button
                                            type="button"
                                            onClick={e => handleDeleteTask(e, t.task_id, t.title)}
                                            style={{
                                                padding: '5px 10px',
                                                backgroundColor: '#fee2e2',
                                                color: '#dc2626',
                                                border: '1px solid #fecaca',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontWeight: '600',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            🗑 Xoá
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Khung chi tiết đầu việc khi bấm mở */}
                            {isExpanded && (
                                <div style={{ padding: '16px', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(0,0,0,0.015)' }}>
                                    {parsed.description && (
                                        <p style={{ marginBottom: '12px', fontSize: '0.95rem' }}>
                                            <strong>Chi tiết công việc:</strong> {parsed.description}
                                        </p>
                                    )}

                                    {/* Danh sách các mục nhỏ để Staff tick chọn tiến độ */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <strong style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                                            Danh sách hạng mục cần thực hiện:
                                        </strong>
                                        {parsed.checklist.length === 0 ? (
                                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                Chưa có mục nhỏ. Staff có thể ghi chú tiến độ bên dưới và gửi cho Admin.
                                            </p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {parsed.checklist.map(item => (
                                                    <label
                                                        key={item.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '10px',
                                                            padding: '8px 12px',
                                                            backgroundColor: 'var(--bg-surface)',
                                                            borderRadius: '6px',
                                                            border: '1px solid var(--border-color)',
                                                            cursor: t.status === 'DONE' ? 'default' : 'pointer'
                                                        }}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={Boolean(item.done)}
                                                            disabled={t.status === 'DONE'}
                                                            onChange={() => handleCheckItem(t.task_id, item.id)}
                                                        />
                                                        <span style={{ textDecoration: item.done ? 'line-through' : 'none' }}>
                                                            {item.text}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Ghi chú báo cáo tiến độ của Staff */}
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ display: 'block', fontWeight: '600', fontSize: '0.9rem', marginBottom: '6px' }}>
                                            Ghi chú báo cáo tiến độ (Staff gửi Admin):
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Nhập kết quả thực hiện công việc để gửi Admin kiểm tra..."
                                            value={parsed.staff_note}
                                            disabled={t.status === 'DONE' && !isAdmin}
                                            onChange={e =>
                                                setDraftProgress(prev => ({
                                                    ...prev,
                                                    [t.task_id]: { ...parsed, staff_note: e.target.value }
                                                }))
                                            }
                                            style={{ width: '100%', padding: '10px', borderRadius: '8px', fontFamily: 'inherit' }}
                                        />
                                    </div>

                                    {/* Nút bấm gửi báo cáo (Staff) & Duyệt/Xoá (Admin) */}
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {t.status !== 'DONE' && (
                                            <button
                                                type="button"
                                                onClick={() => handleSubmitProgressToAdmin(t)}
                                                style={{
                                                    padding: '8px 16px',
                                                    backgroundColor: 'var(--primary)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Gửi tiến độ cho Admin check
                                            </button>
                                        )}

                                        {isAdmin && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleAdminVerifyStatus(t, 'DONE')}
                                                    style={{
                                                        padding: '8px 16px',
                                                        backgroundColor: '#059669',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✓ Duyệt Hoàn Thành (DONE)
                                                </button>
                                                {t.status === 'DONE' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAdminVerifyStatus(t, 'IN_PROGRESS')}
                                                        style={{
                                                            padding: '8px 16px',
                                                            backgroundColor: '#d97706',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '6px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        Yêu cầu làm bổ sung
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default ManageTasks;