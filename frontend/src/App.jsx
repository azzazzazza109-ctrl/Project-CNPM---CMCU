import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import MainLayout from './components/layout/MainLayout.jsx';
import Login from './pages/Login.jsx';
import EventList from './pages/EventList.jsx';
import CreateEvent from './pages/CreateEvent.jsx';
import ManageTasks from './pages/ManageTasks.jsx';
import MyTickets from './pages/MyTickets.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Register from './pages/Register.jsx'; 
import StaffCheckin from './pages/StaffCheckin.jsx';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Route công khai */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} /> 

          {/* Route yêu cầu đăng nhập */}
          <Route element={<ProtectedRoute />}>
            
            {/* Layout chung cho toàn bộ ứng dụng */}
            <Route path="/" element={<MainLayout />}>
              {/* Các trang con nằm bên trong Layout */}
              <Route index element={<EventList />} />
              <Route path="events/:id" element={<EventDetail />} />
              <Route path="my-tickets" element={<MyTickets />} />
              
              {/* Route yêu cầu quyền ADMIN hoặc STAFF (Dành cho Soát vé & Đầu việc Sự kiện) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']} />}>
                <Route path="staff/checkin" element={<StaffCheckin />} />
                <Route path="admin/tasks" element={<ManageTasks />} />
              </Route>

              {/* Route yêu cầu quyền ADMIN (Dành cho Tạo sự kiện) */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route path="admin/create" element={<CreateEvent />} />
              </Route>
            </Route>

          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;