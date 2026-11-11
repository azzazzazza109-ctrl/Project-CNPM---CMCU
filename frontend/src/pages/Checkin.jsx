import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Checkin() {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [mode, setMode] = useState('TICKET_CODE'); // 'QR_TOKEN' | 'TICKET_CODE' | 'STUDENT_CODE'
    const [inputVal, setInputVal] = useState('');
    const [eventId, setEventId] = useState('');
    const [result, setResult] = useState(null);
    const [errorInfo, setErrorInfo] = useState(null);

    useEffect(() => {
        apiClient.get('/events').then(res => {
            if (res.data.success) {
                setEvents(res.data.data);
                if (res.data.data.length > 0) setEventId(res.data.data[0].event_id);
            }
        }).catch(() => {});
    }, []);

    const handleCheckin = async (e) => {
        e.preventDefault();
        setResult(null);
        setErrorInfo(null);

        try {
            const payload = { staff_user_id: user?.user_id };
            if (mode === 'QR_TOKEN') payload.qr_token = inputVal.trim();
            if (mode === 'TICKET_CODE') payload.ticket_code = inputVal.trim();
            if (mode === 'STUDENT_CODE') {
                payload.student_code = inputVal.trim();
                payload.event_id = Number(eventId);
            }

            const res = await apiClient.post('/tickets/checkin', payload);
            if (res.data.success) {
                setResult(res.data.data);
                setInputVal('');
            }
        } catch (err) {
            setErrorInfo({
                message: err.response?.data?.message || 'Lỗi điểm danh',
                data: err.response?.data?.data || null,
            });
        }
    };

    return (
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h2 style={{ marginBottom: '24px' }}>📷 Điểm Danh Sự Kiện (QR / Mã Vé / MSSV)</h2>

            <form onSubmit={handleCheckin} style={{ backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Phương thức điểm danh</label>
                    <select
                        value={mode}
                        onChange={e => setMode(e.target.value)}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    >
                        <option value="TICKET_CODE">1. Nhập Mã vé dự phòng (VD: TK-E1-SV0001)</option>
                        <option value="QR_TOKEN">2. Quét / Dán mã QR Token (64 ký tự hex)</option>
                        <option value="STUDENT_CODE">3. Nhập Mã Sinh viên + Chọn Sự kiện</option>
                    </select>
                </div>

                {mode === 'STUDENT_CODE' && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>Chọn sự kiện</label>
                        <select
                            value={eventId}
                            onChange={e => setEventId(e.target.value)}
                            required
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        >
                            {events.map(ev => (
                                <option key={ev.event_id} value={ev.event_id}>
                                    #{ev.event_id} - {ev.title} ({ev.status})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: '600' }}>
                        {mode === 'QR_TOKEN' ? 'Mã QR Token (64 ký tự hex)' : mode === 'TICKET_CODE' ? 'Mã vé (ticket_code)' : 'Mã sinh viên (student_code)'}
                    </label>
                    <input
                        value={inputVal}
                        onChange={e => setInputVal(e.target.value)}
                        placeholder={mode === 'TICKET_CODE' ? 'VD: TK-E1-SV0001' : mode === 'STUDENT_CODE' ? 'VD: SV0001' : 'Dán chuỗi 64 ký tự hex...'}
                        required
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                    />
                </div>

                <button type="submit" style={{ padding: '12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    Xác nhận Điểm danh
                </button>
            </form>

            {result && (
                <div style={{ marginTop: '20px', padding: '20px', borderRadius: '12px', backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #10b981' }}>
                    <h3 style={{ marginBottom: '8px' }}>✅ Điểm danh thành công!</h3>
                    <p><strong>Sinh viên:</strong> {result.student?.full_name} ({result.student?.student_code})</p>
                    <p><strong>Khoa / Khóa:</strong> {result.student?.faculty_name} — {result.student?.cohort} ({result.student?.class_name})</p>
                    <p><strong>Sự kiện:</strong> {result.event?.title}</p>
                    <p><strong>Mã vé:</strong> {result.ticket_code} (Phương thức: {result.scan_method})</p>
                    <p><strong>Thời gian:</strong> {result.checkin_time_vn}</p>
                </div>
            )}

            {errorInfo && (
                <div style={{ marginTop: '20px', padding: '20px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #ef4444' }}>
                    <h3 style={{ marginBottom: '8px' }}>❌ Từ chối điểm danh</h3>
                    <p style={{ fontWeight: '600' }}>{errorInfo.message}</p>
                </div>
            )}
        </div>
    );
}