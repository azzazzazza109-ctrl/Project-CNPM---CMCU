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
    const [editForm, setEditForm] = useState({
        title: '', description: '', location: '',
        start_time: '', end_time: '', seat_capacity: 100,
        cancel_deadline_hours: 24, status: 'OPEN'
    });
    
    // Đã xóa state faculty, chỉ còn cohort
    const [isAllSchool, setIsAllSchool] = useState(false);
    const [selectedCohorts, setSelectedCohorts] = useState(['K1']);

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

                if (!found.eligibility || found.eligibility.length === 0) {
                    setIsAllSchool(true);
                } else {
                    setIsAllSchool(false);
                    const cohorts = found.eligibility.map(e => e.cohort).filter(Boolean);
                    setSelectedCohorts(cohorts.length > 0 ? [...new Set(cohorts)] : ['K1']);
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
        if (!event?.eligibility || event.eligibility.length === 0) return 'Toàn trường (Mọi Khóa)';
        return event.eligibility.map(el => `${el.cohort || 'Tất cả Khóa'}`).join(', ');
    };

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

    // ✅ ĐÃ CẬP NHẬT: Xử lý giải mã lỗi từ Blob khi xuất file thất bại
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
            if (err.response && err.response.data instanceof Blob) {
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const errorObj = JSON.parse(reader.result);
                        alert('❌ ' + (errorObj.message || 'Lỗi xuất file'));
                    } catch (e) {
                        alert('❌ Lỗi xuất file không xác định.');
                    }
                };
                reader.readAsText(err.response.data);
            } else {
                alert('❌ Không thể xuất file CSV: ' + (err.response?.data?.message || err.message));
            }
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
            let eligibility = [];
            if (!isAllSchool) {
                eligibility = selectedCohorts.map(cohort => ({
                    cohort: cohort,
                    faculty_id: null // Đã sửa thành null
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
                fetchEvent();
            }
        } catch (err) {
            alert('❌ ' + (err.response?.data?.message || 'Lỗi cập nhật'));
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;
    if (!event) return <div style={{ padding: '40px', textAlign: 'center' }}>Không tìm thấy sự kiện</div>;

    const isAdminOrStaff = ['ADMIN', 'STAFF'].includes(user?.system_role);

    return (
        <div className="event-detail-card">
            <h1 className="event-title">{event.title}</h1>
            
            <div className="event-info-grid">
                <div className="event-info-item">
                    <span>📍</span> <strong>Địa điểm:</strong> {event.location}
                </div>
                <div className="event-info-item">
                    <span>📊</span> <strong>Trạng thái:</strong> 
                    <span style={{ color: event.status === 'OPEN' ? '#10B981' : '#EF4444', fontWeight: 'bold', marginLeft: '6px' }}>
                        {event.status}
                    </span>
                </div>
                <div className="event-info-item">
                    <span>🟢</span> <strong>Bắt đầu:</strong> {new Date(event.start_time).toLocaleString('vi-VN')}
                </div>
                <div className="event-info-item">
                    <span>🔴</span> <strong>Kết thúc:</strong> {new Date(event.end_time).toLocaleString('vi-VN')}
                </div>
                <div className="event-info-item">
                    <span>🪑</span> <strong>Số vé đã đặt:</strong> {event.registered_count || 0} / {event.seat_capacity}
                </div>
                <div className="event-info-item">
                    <span>⏳</span> <strong>Hạn hủy vé:</strong> Trước {event.cancel_deadline_hours || 24} giờ
                </div>
            </div>

            <div className="event-description-box">
                <p style={{ margin: '0 0 12px 0', color: '#1E293B' }}>
                    <strong>🎯 Đối tượng tham gia:</strong> {renderEligibility()}
                </p>
                <p style={{ margin: 0, color: '#64748B' }}>
                    <strong>📝 Mô tả:</strong> {event.description || 'Không có mô tả chi tiết'}
                </p>
            </div>

            {msg && (
                <div className={`custom-toast ${msg.includes('❌') ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '0' }}>
                    {msg}
                </div>
            )}

            <div className="event-action-group">
                
                {user?.system_role === 'STUDENT' && event.status === 'OPEN' && (
                    <button onClick={handleRegister} className="btn-event btn-event-primary">
                        🎟️ Đăng Ký Tham Gia Ngay
                    </button>
                )}

                {isAdminOrStaff && (
                    <>
                        <button onClick={() => setIsEditing(true)} className="btn-event btn-event-edit">
                            ✏️ Sửa / Đổi giờ / Sức chứa
                        </button>
                        <button onClick={handleExportCsv} className="btn-event btn-event-export">
                            📥 Xuất CSV Điểm danh
                        </button>
                        <button onClick={handleDelete} className="btn-event btn-event-delete">
                            🗑️ Xóa / Đóng sự kiện
                        </button>
                    </>
                )}
            </div>

            {/* MODAL SỬA SỰ KIỆN */}
            {isEditing && (
                <div className="modal-overlay">
                    <div className="modal-content-premium">
                        <h2 style={{ marginBottom: '24px', color: 'var(--primary)', textAlign: 'center', fontSize: '1.6rem', fontWeight: '800' }}>
                            Chỉnh sửa Sự kiện
                        </h2>
                        
                        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column' }}>
                            
                            <div className="form-group">
                                <label className="form-label">Tên sự kiện</label>
                                <input className="form-input" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} placeholder="Nhập tên sự kiện..." required />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Địa điểm</label>
                                <input className="form-input" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} placeholder="Nhập địa điểm..." required />
                            </div>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Bắt đầu</label>
                                    <input className="form-input" type="datetime-local" value={editForm.start_time} onChange={e => setEditForm({...editForm, start_time: e.target.value})} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Kết thúc</label>
                                    <input className="form-input" type="datetime-local" value={editForm.end_time} onChange={e => setEditForm({...editForm, end_time: e.target.value})} required />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                                <div className="form-group">
                                    <label className="form-label">Sức chứa</label>
                                    <input className="form-input" type="number" min="1" value={editForm.seat_capacity} onChange={e => setEditForm({...editForm, seat_capacity: e.target.value})} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Hạn hủy (giờ)</label>
                                    <input className="form-input" type="number" min="0" value={editForm.cancel_deadline_hours} onChange={e => setEditForm({...editForm, cancel_deadline_hours: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="form-input" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                        <option value="OPEN">OPEN</option>
                                        <option value="FULL">FULL</option>
                                        <option value="CLOSED">CLOSED</option>
                                    </select>
                                </div>
                            </div>

                            {/* PHẦN ĐIỀU KIỆN THAM GIA (Đã bỏ Khoa) */}
                            <div style={{ padding: '20px', backgroundColor: '#F8FAFC', borderRadius: '16px', border: '1px solid #E2E8F0', marginTop: '8px' }}>
                                <h3 style={{ fontSize: '1rem', marginBottom: '16px', color: 'var(--primary)' }}>Điều kiện tham gia</h3>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', fontWeight: '500', color: '#1E293B' }}>
                                    <input type="checkbox" checked={isAllSchool} onChange={(e) => setIsAllSchool(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                                    Mở cho toàn trường (Mọi khóa)
                                </label>

                                {!isAllSchool && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'modalFadeIn 0.3s ease' }}>
                                        <div>
                                            <label className="form-label">Các Khóa được tham gia:</label>
                                            <div className="cohort-pills">
                                                {['K1', 'K2', 'K3', 'K4'].map(cohort => {
                                                    const isSelected = selectedCohorts.includes(cohort);
                                                    return (
                                                        <label key={cohort} className={`cohort-pill-label ${isSelected ? 'active' : ''}`}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected} 
                                                                onChange={() => handleCohortToggle(cohort)} 
                                                            />
                                                            {isSelected && '✓'} {cohort}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="button" onClick={() => setIsEditing(false)} className="btn-modal-cancel">
                                    Hủy bỏ
                                </button>
                                <button type="submit" className="btn-modal-save">
                                    💾 Lưu thay đổi
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}