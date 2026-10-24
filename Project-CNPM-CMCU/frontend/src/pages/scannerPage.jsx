import { useEffect, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../services/api';
import { Link } from 'react-router-dom';

export default function ScannerPage() {
    const [scanResult, setScanResult] = useState(null);
    const [manualCode, setManualCode] = useState('');

    const handleCheckin = async (code) => {
        try {
            const res = await api.post('/tickets/checkin', { qr_token: code });
            setScanResult({ type: 'success', msg: res.data.message });
        } catch (error) {
            setScanResult({ type: 'error', msg: error.response?.data?.message || 'Lỗi kết nối Server' });
        }
    };

    useEffect(() => {
        const scanner = new Html5QrcodeScanner("reader", { fps: 20, qrbox: { width: 250, height: 250 }, formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ] });
        scanner.render(
            async (decodedText) => { scanner.pause(); await handleCheckin(decodedText); setTimeout(() => scanner.resume(), 3000); }, 
            (error) => { /* Bỏ qua lỗi */ }
        );
        return () => { try { scanner.clear(); } catch (error) {} };
    }, []);

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
            <div className="w-full max-w-lg mb-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800">Bàn Soát Vé</h2>
                <Link to="/admin" className="text-blue-600 hover:underline">Về Admin</Link>
            </div>

            <div id="reader" className="w-full max-w-lg border-4 border-blue-600 rounded-2xl overflow-hidden bg-black min-h-[300px] mb-6 shadow-lg"></div>

            {scanResult && (
                <div className={`w-full max-w-lg p-5 rounded-xl font-bold text-center text-lg mb-6 shadow-md border-2 ${scanResult.type === 'success' ? 'bg-green-100 text-green-700 border-green-500' : 'bg-red-100 text-red-700 border-red-500'}`}>
                    {scanResult.msg}
                </div>
            )}

            <div className="w-full max-w-lg bg-white p-6 rounded-2xl shadow-md">
                <h3 className="font-semibold text-gray-700 mb-3">Dự phòng: Nhập mã vé thủ công</h3>
                <div className="flex gap-3">
                    <input type="text" placeholder="VD: TK-E1-BIT250001" value={manualCode} onChange={(e) => setManualCode(e.target.value)} className="flex-1 border p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
                    <button onClick={() => { if(manualCode) { handleCheckin(manualCode); setManualCode(''); } }} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition">Check-in</button>
                </div>
            </div>
        </div>
    );
}