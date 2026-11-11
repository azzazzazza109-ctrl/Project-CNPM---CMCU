import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState('');
    
    // State cho Modal Sửa
    const [isEditing, setIsEditing] = useState(false);
    const [faculties, setFaculties] = useState([]);
    const [editForm, setEditForm] = useState({
        title: '', description: '', location: '',
        start_time: '', end_time: '', seat_capacity: 100,
        cancel_deadline_hours: 24, status: 'OPEN'
    });
    
    // State cho Điều kiện tham gia trong Modal (Đã đổi thành Mảng selectedCohorts)
    const [isAllSchool, setIsAllSchool] = useState(false);
    const [selectedCohorts, setSelectedCohorts] = useState(['K1']);
    const [selectedFaculty, setSelectedFaculty] = useState('ALL');

    // Lấy danh sách Khoa từ API /meta
    useEffect(() => {
        apiClient.get('/meta').then(res => {
            if (res.data.success) setFaculties(res.data.data.faculties);
        }).catch(err => console.error(err));
    }, []);

    const fetchEvent = async () => {
        try {
            const res = await apiClient.get('/events');
            const found = res.data.data.find(e => e.event_id === Number(id));
            setEvent(found);
            
            if (found) {
                setEditForm({
                    title: found.title || '',
                    description: found.description || '',
                    location: found.location || '',
                    start_time: found.start_time ? new Date(found.start_time).toISOString().slice(0, 16) : '',
                    end_time: found.end_time ? new Date(found.end_time).toISOString().slice(0, 16) : '',
                    seat_capacity: found.seat_capacity || 100,
                    cancel_deadline_hours: found.cancel_deadline_hours || 24,
                    status: found.status || 'OPEN',
                });

                // Xử lý logic hiển thị Điều kiện tham gia
                if (!found.eligibility || found.eligibility.length === 0) {
                    setIsAllSchool(true);
                } else {
                    setIsAllSchool(false);
                    // Lấy TẤT CẢ các khóa hiện có đưa vào mảng
                    const cohorts = found.eligibility.map(e => e.cohort).filter(Boolean);
                    setSelectedCohorts(cohorts.length > 0 ? [...new Set(cohorts)] : ['K1']); // Dùng Set để loại bỏ trùng lặp
                    
                    // Lấy faculty_id của điều kiện đầu tiên
                    setSelectedFaculty(found.eligibility[0].faculty_id ? String(found.eligibility[0].faculty_id) : 'ALL');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEvent();
    }, [id]);

    const renderEligibility = () => {
        if (!event?.eligibility || event.eligibility.length === 0) return 'Toàn trường (Mọi Khóa, mọi Khoa)';
        return event.eligibility.map(el => `${el.cohort || 'Tất cả Khóa'} - ${el.faculty_name || 'Tất cả Khoa'}`).join(', ');
    };

    // Hàm xử lý khi tích/bỏ tích Checkbox Khóa
    const handleCohortToggle = (cohort) => {
        if (selectedCohorts.includes(cohort)) {
            setSelectedCohorts(selectedCohorts.filter(c => c !== cohort));
        } else {
            setSelectedCohorts([...selectedCohorts, cohort]);
        }
    };

    const handleRegister = async () => {
        if (!user?.student_code) return setMsg('❌ Tài khoản của bạn không có mã sinh viên để đăng ký.');
        setMsg('Đang xử lý...');
        try {
            const res = await apiClient.post('/tickets/register', { event_id: Number(id), student_code: user.student_code });
            setMsg('✅ ' + res.data.message);
            setTimeout(() => navigate('/my-tickets'), 1500);
        } catch (error) {
            setMsg('❌ ' + (error.response?.data?.message || error.message));
        }
    };

    const handleExportCsv = async () => {
        try {
            const res = await apiClient.get(`/admin/events/${id}/export?admin_user_id=${user.user_id}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `diemdanh_event_${id}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            alert('❌ Không thể xuất file CSV: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa sự kiện này?')) return;
        try {
            const res = await apiClient.delete(`/admin/events/${id}?admin_user_id=${user.user_id}`);
            alert('✅ ' + res.data.message);
            navigate('/');
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Lỗi xóa sự kiện'));
        }
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!isAllSchool && selectedCohorts.length === 0) {
            alert("Vui lòng chọn ít nhất 1 Khóa hoặc tích 'Mở cho toàn trường'.");
            return;
        }

        try {
            // Xử lý lại mảng eligibility trước khi gửi
            let eligibility = [];
            if (!isAllSchool) {
                // Map mảng các Khóa đã chọn thành mảng object
                eligibility = selectedCohorts.map(cohort => ({
                    cohort: cohort,
                    faculty_id: selectedFaculty === 'ALL' ? null : Number(selectedFaculty)
                }));
            }

            const res = await apiClient.put(`/admin/events/${id}`, {
                admin_user_id: user.user_id,
                ...editForm,
                seat_capacity: Number(editForm.seat_capacity),
                cancel_deadline_hours: Number(editForm.cancel_deadline_hours),
                eligibility: eligibility
            });
            if (res.data.success) {
                alert('✅ Cập nhật thành công!');
                setIsEditing(false);
                fetchEvent(); // Tải lại data mới
            }
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Lỗi cập nhật'));
        }
    };

    if (loading) return <div>Đang tải...</div>;
    if (!event) return <div>Không tìm thấy sự kiện</div>;

    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(user?.system_role);

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: 'var(--bg-surface)', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h1 style={{ color: 'var(--primary)', marginBottom: '24px' }}>{event.title}</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                <p><strong>📍 Địa điểm:</strong> {event.location}</p>
                <p><strong>📊 Trạng thái:</strong> <span style={{ color: event.status === 'OPEN' ? 'green' : 'red', fontWeight: 'bold' }}>{event.status}</span></p>
                <p><strong>🟢 Bắt đầu:</strong> {new Date(event.start_time).toLocaleString('vi-VN')}</p>
                <p><strong>🔴 Kết thúc:</strong> {new Date(event.end_time).toLocaleString('vi-VN')}</p>
                <p><strong>🪑 Số vé đã đặt:</strong> {event.registered_count || 0} / {event.seat_capacity}</p>
                <p><strong>⏳ Hạn hủy vé:</strong> Trước {event.cancel_deadline_hours || 24} giờ</p>
            </div>

            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
                <p style={{ margin: 0 }}><strong>🎯 Đối tượng tham gia:</strong> {renderEligibility()}</p>
                <p style={{ margin: '8px 0 0 0', color: 'var(--text-muted)' }}><strong>Mô tả:</strong> {event.description || 'Không có mô tả'}</p>
            </div>

            {msg && <div style={{ padding: '12px', marginBottom: '20px', backgroundColor: msg.includes('❌') ? '#fee2e2' : '#d1fae5', color: msg.includes('❌') ? '#991b1b' : '#065f46', borderRadius: '8px' }}>{msg}</div>}

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '32px', paddingTop: '20px', borderTop: '1px solid var(--border-color)' }}>
                {user?.system_role === 'STUDENT' && event.status === 'OPEN' && (
                    <button onClick={handleRegister} style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
                        Đăng Ký Tham Gia
                    </button>
                )}

                {isAdminOrStaff && (
                    <>
                        <button onClick={() => setIsEditing(true)} style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            ✏️ Sửa / Đổi giờ / Sức chứa
                        </button>
                        <button onClick={handleExportCsv} style={{ padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            📥 Xuất CSV Điểm danh
                        </button>
                        <button onClick={handleDelete} style={{ padding: '10px 20px', background: '#50adf4', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                            🗑️ Xóa / Đóng sự kiện
                        </button>
                    </>
                )}
            </div>

            {/* MODAL SỬA SỰ KIỆN DÀNH CHO ADMIN */}
            {isEditing && (
                <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '16px' }}>
                    <div style={{ backgroundColor: 'var(--bg-surface)', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h2 style={{ marginBottom: '24px', color: 'var(--primary)' }}>Chỉnh sửa Sự kiện</h2>
                        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Tên sự kiện" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            <input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Địa điểm" required style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Bắt đầu</label>
                                    <input type="datetime-local" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Kết thúc</label>
                                    <input type="datetime-local" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Sức chứa</label>
                                    <input type="number" min="1" value={editForm.seat_capacity} onChange={e => setEditForm({...editForm, seat_capacity: e.target.value})} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Hạn hủy (giờ)</label>
                                    <input type="number" min="0" value={editForm.cancel_deadline_hours} onChange={e => setEditForm({...editForm, cancel_deadline_hours: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.9rem', fontWeight: '600' }}>Trạng thái</label>
                                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                        <option value="OPEN">OPEN</option>
                                        <option value="FULL">FULL</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>
                                </div>
                            </div>

                            {/* PHẦN CHỌN ĐIỀU KIỆN THAM GIA (Đã cập nhật Checkbox nhiều khóa) */}
                            <div style={{ padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', marginTop: '8px' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--primary)' }}>Điều kiện tham gia</h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', fontWeight: '500' }}>
                                    <input type="checkbox" checked={isAllSchool} onChange={(e) => setIsAllSchool(e.target.checked)} />
                                    Mở cho toàn trường (Mọi khóa, mọi khoa)
                                </label>

                                {!isAllSchool && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Checkboxes cho Khóa */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '0.9rem' }}>Các Khóa được tham gia:</label>
                                            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                                {['K1', 'K2', 'K3', 'K4'].map(cohort => (
                                                    <label key={cohort} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedCohorts.includes(cohort)} 
                                                            onChange={() => handleCohortToggle(cohort)} 
                                                        />
                                                        {cohort}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        {/* Dropdown cho Khoa */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600', fontSize: '0.9rem' }}>Khoa</label>
                                            <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                                <option value="ALL">Tất cả các khoa</option>
                                                {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                                <button type="submit" style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>💾 Lưu thay đổi</button>
                                <button type="button" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Hủy</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}