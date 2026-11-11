import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Bỏ chữ src/

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) return <div>Đang tải...</div>;
    if (!user) return <Navigate to="/login" replace />;
    
    // Nếu có yêu cầu role cụ thể mà user không đủ quyền
    if (allowedRoles && !allowedRoles.includes(user.system_role)) {
        return <Navigate to="/" replace />; // Đá về trang chủ
    }

    return <Outlet />; // Nếu thỏa mãn thì cho phép đi tiếp vào các route con
}