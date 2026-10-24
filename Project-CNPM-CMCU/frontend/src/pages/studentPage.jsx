import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { QRCodeCanvas } from 'qrcode.react';

export default function StudentPage() {
    const [ticket, setTicket] = useState(null); // Vé vừa đăng ký thành công
    const [myTickets, setMyTickets] = useState([]); // Danh sách vé đã đăng ký
    const [error, setError] = useState('');
    const [user, setUser] = useState(null);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const navigate = useNavigate();

    // Hàm lấy danh sách vé
    const fetchMyTickets = () => {
        api.get('/tickets/my-tickets')
           .then(res => setMyTickets(res.data))
           .catch(err => console.log(err));
    };

    useEffect(() => {
        api.get('/auth/me').then(res => setUser(res.data.user)).catch(() => navigate('/login'));
        api.get('/events').then(res => {
            setEvents(res.data);
            if (res.data.length > 0) setSelectedEvent(res.data[0].event_id);
        }).catch(err => console.log(err));
        
        fetchMyTickets(); // Gọi lấy danh sách vé khi load trang
    }, [navigate]);

    const handleRegister = async () => {
        if (!selectedEvent) return alert("Vui lòng chọn sự kiện!");
        try {
            const res = await api.post('/tickets/register', { event_id: Number(selectedEvent) });
            setTicket(res.data.data);
            setError('');
            fetchMyTickets(); // Tải lại danh sách vé sau khi đăng ký thành công
        } catch (err) {
            setError(err.response?.data?.message || 'Lỗi kết nối');
        }
    };

    const handleCancel = async (ticketId) => {
        if (!window.confirm("Bạn có chắc chắn muốn hủy vé này không?")) return;
        try {
            await api.post('/tickets/cancel', { ticket_id: ticketId });
            alert("Hủy vé thành công!");
            fetchMyTickets(); // Tải lại danh sách sau khi hủy
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    const handleLogout = async () => {
        await api.post('/auth/logout');
        localStorage.removeItem('user');
        navigate('/login');
    };

    if (!user) return <div className="text-center mt-20 text-xl font-semibold">Đang kiểm tra đăng nhập...</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-10 px-4 pb-10">
            {/* Header */}
            <div className="w-full max-w-4xl flex justify-between items-center bg-white p-4 rounded-xl shadow-md mb-6">
                <h3 className="font-semibold text-gray-700">Xin chào, <span className="text-blue-600">{user.full_name}</span></h3>
                <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-1.5 rounded-lg hover:bg-red-600 transition text-sm font-medium">
                    Đăng xuất
                </button>
            </div>

            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Cột Trái: Đăng ký vé */}
                <div className="bg-white p-8 rounded-2xl shadow-xl h-fit">
                    <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">ĐĂNG KÝ VÉ</h2>
                    
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-4 text-center font-medium">{error}</div>}
                    
                    {!ticket ? (
                        <div className="flex flex-col gap-5">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">Chọn sự kiện tham gia:</label>
                                <select 
                                    value={selectedEvent} 
                                    onChange={(e) => setSelectedEvent(e.target.value)}
                                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                    {events.map(ev => (
                                        <option key={ev.event_id} value={ev.event_id}>
                                            {ev.title} (Sức chứa: {ev.seat_capacity})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button onClick={handleRegister} className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition duration-200 text-lg shadow-md">
                                Đăng ký ngay
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-full font-bold mb-4">
                                ✓ Đăng ký thành công!
                            </div>
                            <p className="font-mono text-xl font-bold text-gray-800 mb-4">{ticket.ticket_code}</p>
                            <div className="p-4 bg-white border-2 border-dashed border-blue-400 rounded-xl inline-block shadow-sm">
                                <QRCodeCanvas value={ticket.qr_token} size={200} />
                            </div>
                            <button onClick={() => setTicket(null)} className="mt-4 text-blue-600 hover:underline block mx-auto text-sm">
                                Đăng ký sự kiện khác
                            </button>
                        </div>
                    )}
                </div>

                {/* Cột Phải: Danh sách vé đã đăng ký */}
                <div className="bg-white p-8 rounded-2xl shadow-xl">
                    <h2 className="text-2xl font-bold text-center text-blue-800 mb-6">VÉ CỦA TÔI</h2>
                    
                    {myTickets.length === 0 ? (
                        <p className="text-center text-gray-500">Bạn chưa đăng ký vé nào.</p>
                    ) : (
                        <div className="space-y-4">
                            {myTickets.map(tk => (
                                <div key={tk.ticket_id} className="border p-4 rounded-xl flex flex-col gap-2 bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{tk.event_title}</h4>
                                            <p className="text-sm font-mono text-blue-600">{tk.ticket_code}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            tk.checkin_status === 'REGISTERED' ? 'bg-yellow-100 text-yellow-700' :
                                            tk.checkin_status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                            {tk.checkin_status}
                                        </span>
                                    </div>
                                    
                                    {/* Chỉ hiện nút Hủy nếu vé đang ở trạng thái REGISTERED */}
                                    {tk.checkin_status === 'REGISTERED' && (
                                        <button 
                                            onClick={() => handleCancel(tk.ticket_id)}
                                            className="mt-2 text-sm text-red-600 font-medium hover:underline text-left"
                                        >
                                            Hủy vé này
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}