import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentPage from './pages/studentPage';
import ScannerPage from './pages/scannerPage';
import AdminPage from './pages/adminPage';
import LoginPage from './pages/loginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Đặt Route cho trang login ở đây */}
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<StudentPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;