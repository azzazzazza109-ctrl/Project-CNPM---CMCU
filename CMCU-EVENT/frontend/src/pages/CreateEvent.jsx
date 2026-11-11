import { useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function CreateEvent() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({ title: '', description: '', location: '', start_time: '', end_time: '', seat_capacity: 100 });
    
    const [selectedCohorts, setSelectedCohorts] = useState(['K1']); 
    const [isAllSchool, setIsAllSchool] = useState(false);
    const [msg, setMsg] = useState('');

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleCohortToggle = (cohort) => {
        if (selectedCohorts.includes(cohort)) {
            setSelectedCohorts(selectedCohorts.filter(c => c !== cohort));
        } else {
            setSelectedCohorts([...selectedCohorts, cohort]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isAllSchool && selectedCohorts.length === 0) {
            setMsg('❌ Vui lòng chọn ít nhất 1 Khóa hoặc chọn "Mở cho toàn trường".');
            return;
        }

        try {
            let eligibility = [];
            if (!isAllSchool) {
                // Bỏ faculty_id, chỉ giữ lại cohort
                eligibility = selectedCohorts.map(cohort => ({
                    cohort: cohort,
                    faculty_id: null
                }));
            }

            const res = await apiClient.post('/admin/events', {
                ...formData,
                admin_user_id: user?.user_id,
                eligibility
            });
            if (res.data.success) {
                setMsg('✅ Tạo sự kiện thành công!');
                setFormData({ title: '', description: '', location: '', start_time: '', end_time: '', seat_capacity: 100 });
            }
        } catch (error) {
            setMsg('❌ Lỗi: ' + (error.response?.data?.message || error.message));
        }
    };

    return (
        <div className="create-event-container">
            <h2 className="create-event-title">Tạo Sự Kiện Mới</h2>
            
            {msg && (
                <div className={`custom-toast ${msg.includes('❌') ? 'toast-error' : 'toast-success'}`} style={{ marginBottom: '24px' }}>
                    {msg}
                </div>
            )}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
                
                <div className="form-group">
                    <label className="form-label">Tên sự kiện</label>
                    <input name="title" className="form-input" placeholder="Nhập tên sự kiện..." value={formData.title} onChange={handleChange} required />
                </div>

                <div className="form-group">
                    <label className="form-label">Địa điểm</label>
                    <input name="location" className="form-input" placeholder="Nhập địa điểm..." value={formData.location} onChange={handleChange} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                        <label className="form-label">Bắt đầu</label>
                        <input type="datetime-local" name="start_time" className="form-input" value={formData.start_time} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Kết thúc</label>
                        <input type="datetime-local" name="end_time" className="form-input" value={formData.end_time} onChange={handleChange} required />
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Số lượng ghế</label>
                    <input type="number" name="seat_capacity" className="form-input" value={formData.seat_capacity} onChange={handleChange} required />
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
                                <label className="form-label">Chọn các Khóa được tham gia:</label>
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

                <button type="submit" className="btn-create-submit">
                    🚀 Tạo Sự Kiện
                </button>
            </form>
        </div>
    );
}
export default CreateEvent;