import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

function CreateEvent() {
    const { user } = useAuth();
    const [formData, setFormData] = useState({ title: '', description: '', location: '', start_time: '', end_time: '', seat_capacity: 100 });
    const [faculties, setFaculties] = useState([]);
    
    // Chuyển sang mảng các khóa được chọn
    const [selectedCohorts, setSelectedCohorts] = useState(['K1']); 
    const [selectedFaculty, setSelectedFaculty] = useState('ALL');
    const [isAllSchool, setIsAllSchool] = useState(false);
    const [msg, setMsg] = useState('');

    useEffect(() => {
        apiClient.get('/meta').then(res => {
            if (res.data.success) setFaculties(res.data.data.faculties);
        }).catch(err => console.error(err));
    }, []);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Hàm xử lý khi tích/bỏ tích Checkbox Khóa
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
                // Map mảng selectedCohorts thành mảng object eligibility
                eligibility = selectedCohorts.map(cohort => ({
                    cohort: cohort,
                    faculty_id: selectedFaculty === 'ALL' ? null : Number(selectedFaculty)
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
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'var(--bg-surface)', padding: '32px', borderRadius: '12px' }}>
            <h2 style={{ marginBottom: '24px' }}>Tạo Sự Kiện Mới</h2>
            {msg && <p style={{ padding: '12px', borderRadius: '8px', backgroundColor: msg.includes('✅') ? '#d1fae5' : '#fee2e2', color: msg.includes('✅') ? '#065f46' : '#991b1b', marginBottom: '16px' }}>{msg}</p>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* ... Các input Tên, Địa điểm, Thời gian, Số ghế (giữ nguyên như cũ) ... */}
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Tên sự kiện</label>
                    <input name="title" placeholder="Nhập tên sự kiện..." value={formData.title} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Địa điểm</label>
                    <input name="location" placeholder="Nhập địa điểm..." value={formData.location} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Bắt đầu</label>
                        <input type="datetime-local" name="start_time" value={formData.start_time} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Kết thúc</label>
                        <input type="datetime-local" name="end_time" value={formData.end_time} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                    </div>
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Số lượng ghế</label>
                    <input type="number" name="seat_capacity" value={formData.seat_capacity} onChange={handleChange} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                </div>

                {/* PHẦN CHỌN ĐIỀU KIỆN THAM GIA */}
                <div style={{ marginTop: '8px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--primary)' }}>Điều kiện tham gia</h3>
                    
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', cursor: 'pointer', fontWeight: '500' }}>
                        <input type="checkbox" checked={isAllSchool} onChange={(e) => setIsAllSchool(e.target.checked)} />
                        Mở cho toàn trường (Mọi khóa, mọi khoa)
                    </label>

                    {!isAllSchool && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Chọn các Khóa được tham gia:</label>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    {['K1', 'K2', 'K3', 'K4'].map(cohort => (
                                        <label key={cohort} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
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
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontWeight: '500' }}>Khoa</label>
                                <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                                    <option value="ALL">Tất cả các khoa</option>
                                    {faculties.map(f => <option key={f.faculty_id} value={f.faculty_id}>{f.faculty_name}</option>)}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <button type="submit" style={{ padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', marginTop: '8px', cursor: 'pointer' }}>Tạo Sự Kiện</button>
            </form>
        </div>
    );
}
export default CreateEvent;