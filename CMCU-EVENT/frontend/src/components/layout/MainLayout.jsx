import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext';

export default function MainLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { path: '/', label: '📋 Danh sách sự kiện' },
    { path: '/my-tickets', label: '🎟️ Vé của tôi' },
    ...(user?.system_role === 'ADMIN' || user?.system_role === 'STAFF' ? [
        { path: '/staff/checkin', label: '📷 Soát vé (Staff)' },
    ] : []),
    ...(user?.system_role === 'ADMIN' ? [
        { path: '/admin/create', label: '➕ Tạo sự kiện' },
        { path: '/admin/tasks', label: '📝 Quản lý Task' },
    ] : [])
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-body)' }}>
      
      {/* SIDEBAR */}
      <aside 
        className="sidebar-animated-bg" 
        style={{
          width: isSidebarOpen ? '260px' : '0',
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 10,
          position: 'relative'
        }}
      >
        <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap', zIndex: 1 }}>
          <img 
            src={logo} 
            alt="CMCU Logo" 
            style={{ 
              height: '35px', 
              width: 'auto', 
              objectFit: 'contain',
              filter: 'brightness(0) invert(1) drop-shadow(0px 0px 8px rgba(255,255,255,0.3))' 
            }} 
          />
          <span style={{ fontWeight: '800', fontSize: '1.2rem', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
            CMCU Events
          </span>
        </div>
        
        <nav className="nav-menu-container">
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
                             (item.path === '/' && location.pathname.startsWith('/events'));
            
            const icon = item.label.split(' ')[0];
            const text = item.label.substring(item.label.indexOf(' ') + 1);

            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                style={{ animationDelay: `${index * 0.05 + 0.1}s` }}
              >
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span>{text}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* VÙNG NỘI DUNG CHÍNH */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* ✅ HEADER ĐÃ SỬA LỖI */}
        <header className="premium-header">
          
          {/* Bên Trái */}
          <div className="header-left-anim" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', transition: 'transform 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1) rotate(-10deg)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
            >
              ☰
            </button>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#1E293B' }}>Hệ thống Quản lý Sự kiện</h2>
          </div>

          {/* Bên Phải */}
          {user && (
            <div className="header-right-anim" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              
              <div className="user-profile-wrapper">
                <div className="header-avatar-new">
                  {user.full_name.charAt(0)}
                </div>
                <div className="user-info-new">
                  <span className="user-name-new">{user.full_name}</span>
                  <span className={`user-role-badge ${user.system_role === 'ADMIN' ? 'admin' : ''}`}>
                    {user.system_role}
                  </span>
                </div>
              </div>
              
              <button onClick={handleLogout} className="btn-logout-new">
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                </svg>
                Đăng xuất
              </button>

            </div>
          )}
        </header>

        <main className="main-content" style={{ 
          padding: '32px', 
          paddingTop: '16px', 
          flex: 1, 
          backgroundColor: 'var(--bg-body)',
          overflowY: 'auto'
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}