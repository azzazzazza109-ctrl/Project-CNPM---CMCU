import { useEffect, useState } from 'react';
import apiClient from '../api/client';

function EventList() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await apiClient.get('/events');
                if (response.data.success) {
                    setEvents(response.data.data);
                }
            } catch (error) {
                console.error('Lỗi lấy sự kiện:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) return <div>Đang tải dữ liệu...</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h1>Danh sách sự kiện</h1>
            {events.length === 0 ? (
                <p>Chưa có sự kiện nào. Hãy thêm dữ liệu vào Database.</p>
            ) : (
                <ul>
                    {events.map(event => (
                        <li key={event.event_id} style={{ marginBottom: '10px', border: '1px solid #ccc', padding: '10px' }}>
                            <strong>{event.title}</strong> - {event.location} <br />
                            Thời gian: {new Date(event.start_time).toLocaleString()} <br />
                            Trạng thái: {event.status}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default EventList;