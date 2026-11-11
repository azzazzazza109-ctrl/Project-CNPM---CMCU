import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải dữ liệu...</div>;

    // Hàm xử lý hiệu ứng nghiêng 3D
    const handleMouseMove = (e) => {
        const card = e.currentTarget;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        // Tính toán góc xoay (tối đa 10 độ)
        const rotateX = ((y - centerY) / centerY) * -10; 
        const rotateY = ((x - centerX) / centerX) * 10;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = (e) => {
        const card = e.currentTarget;
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
    };

    return (
        <div>
            <h1 style={{ marginBottom: '32px', fontSize: '1.8rem', fontWeight: '800' }}>Danh sách sự kiện</h1>
            {events.length === 0 ? (
                <p>Chưa có sự kiện nào. Hãy thêm dữ liệu vào Database.</p>
            ) : (
                <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {events.map((event, index) => {
                        const bgClass = `bg-card-${((event.event_id - 1) % 5) + 1}`;

                        return (
                            <Link 
                                to={`/events/${event.event_id}`} 
                                key={event.event_id} 
                                className={`event-card event-card-animated ${bgClass}`}
                                style={{ 
                                    textDecoration: 'none', 
                                    color: 'inherit',       
                                    display: 'flex',       
                                    flexDirection: 'column',
                                    border: '1px solid rgba(79, 70, 229, 0.15)', 
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 10px -1px rgba(0,0,0,0.05)',
                                    overflow: 'hidden',    
                                    cursor: 'pointer',
                                    position: 'relative',
                                    animationDelay: `${index * 0.1}s`,
                                    transition: 'transform 0.15s ease-out, box-shadow 0.3s ease' // Thêm transition cho hiệu ứng 3D mượt
                                }}
                                onMouseMove={handleMouseMove}
                                onMouseLeave={handleMouseLeave}
                            >
                                <div style={{ height: '8px', width: '100%', background: 'linear-gradient(90deg, #4F46E5 0%, #9333EA 100%)' }}></div>

                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h3 style={{ color: 'var(--primary)', marginBottom: '16px', fontSize: '1.35rem', fontWeight: '800', lineHeight: '1.4' }}>
                                        {event.title}
                                    </h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                                        <p style={{ color: '#475569', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '500' }}>
                                            <span style={{ fontSize: '1.1rem' }}>📍</span> {event.location}
                                        </p>
                                        
                                        <p style={{ fontSize: '0.95rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#475569', fontWeight: '500' }}>
                                            <span style={{ fontSize: '1.1rem' }}>🕒</span> {new Date(event.start_time).toLocaleString('vi-VN')}
                                        </p>
                                    </div>
                                    
                                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed rgba(79, 70, 229, 0.2)', paddingTop: '16px' }}>
                                        <span 
                                            className={event.status === 'OPEN' ? 'status-badge-open' : ''}
                                            style={{ 
                                                display: 'inline-block', padding: '6px 14px', borderRadius: '20px',
                                                fontSize: '0.85rem', fontWeight: '700',
                                                backgroundColor: event.status === 'OPEN' ? '#D1FAE5' : '#FEE2E2',
                                                color: event.status === 'OPEN' ? '#065F46' : '#991B1B',
                                                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                                            }}
                                        >
                                            {event.status === 'OPEN' ? '🟢 Đang mở' : '🔴 Đã đóng'}
                                        </span>
                                        <span style={{ fontSize: '0.95rem', color: 'var(--primary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            Xem chi tiết <span className="arrow-icon" style={{ fontSize: '1.2rem', display: 'inline-block' }}>→</span>
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default EventList;