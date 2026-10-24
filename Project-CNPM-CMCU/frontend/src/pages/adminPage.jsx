import { useEffect, useState } from 'react';
import api from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminPage() {
    const [users, setUsers] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState('');
    const [eventCapacity, setEventCapacity] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const savedUser = JSON.parse(localStorage.getItem('user'));
        if (!savedUser || savedUser.system_role !== 'ADMIN') {
            alert("Bạn không có quyền truy cập trang này!");
            navigate('/login');
            return;
        }

        Promise.all([api.get('/admin/users'), api.get('/admin/tickets')])
            .then(([usersRes, ticketsRes]) => {
                setUsers(usersRes.data);
                setTickets(ticketsRes.data);
                setLoading(false);
            }).catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, [navigate]);

    const handleCreateEvent = async (e) => {
        e.preventDefault();
        try {
            await api.post('/events', { title: eventTitle, seat_capacity: Number(eventCapacity) });
            alert("Tạo sự kiện thành công!");
            setEventTitle('');
            setEventCapacity('');
        } catch (err) {
            alert("Lỗi: " + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return <div className="text-center mt-20 text-xl font-semibold">Đang tải dữ liệu...</div>;

    return (
        <div className="p-8 max-w-6xl mx-auto bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-8 border-b pb-4">
                <h2 className="text-3xl font-bold text-blue-800">Trang Quản Trị</h2>
                <div className="flex gap-3">
                    <Link to="/" className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">Trang Sinh Viên</Link>
                    <Link to="/scanner" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition">Trạm Soát Vé</Link>
                </div>
            </div>

            {/* Form Tạo Sự Kiện */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8 border-l-4 border-green-500">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Tạo Sự Kiện Mới</h3>
                <form onSubmit={handleCreateEvent} className="flex flex-col md:flex-row gap-4">
                    <input 
                        type="text" placeholder="Tên sự kiện..." 
                        value={eventTitle} onChange={e => setEventTitle(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required
                    />
                    <input 
                        type="number" placeholder="Sức chứa..." 
                        value={eventCapacity} onChange={e => setEventCapacity(e.target.value)}
                        className="w-full md:w-32 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" required
                    />
                    <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 font-semibold transition">
                        + Thêm
                    </button>
                </form>
            </div>

            {/* Bảng Người Dùng */}
            <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Danh sách Người Dùng</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600">
                                <th className="p-3 border-b">ID</th>
                                <th className="p-3 border-b">Mã SV</th>
                                <th className="p-3 border-b">Họ Tên</th>
                                <th className="p-3 border-b">Email</th>
                                <th className="p-3 border-b text-center">Quyền</th>
                                <th className="p-3 border-b text-center">Vé đã đặt</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.user_id} className="hover:bg-gray-50">
                                    <td className="p-3 border-b">{u.user_id}</td>
                                    <td className="p-3 border-b font-medium">{u.student_code || 'N/A'}</td>
                                    <td className="p-3 border-b">{u.full_name}</td>
                                    <td className="p-3 border-b">{u.email}</td>
                                    <td className="p-3 border-b text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${u.system_role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                            {u.system_role}
                                        </span>
                                    </td>
                                    <td className="p-3 border-b text-center font-bold">{u.total_tickets}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Bảng Vé */}
            <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Danh sách Vé đã phát hành</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600">
                                <th className="p-3 border-b">Mã Vé</th>
                                <th className="p-3 border-b">Sinh Viên</th>
                                <th className="p-3 border-b">Sự Kiện</th>
                                <th className="p-3 border-b text-center">Trạng Thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickets.map(t => (
                                <tr key={t.ticket_id} className="hover:bg-gray-50">
                                    <td className="p-3 border-b font-mono text-blue-600 font-bold">{t.ticket_code}</td>
                                    <td className="p-3 border-b">{t.full_name}</td>
                                    <td className="p-3 border-b">{t.event_title}</td>
                                    <td className="p-3 border-b text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${t.checkin_status === 'CHECKED_IN' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {t.checkin_status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}