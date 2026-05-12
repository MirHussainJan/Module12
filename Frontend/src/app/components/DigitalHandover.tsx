import { Link } from 'react-router';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { apiPost } from '../lib/api';

export default function DigitalHandover() {
  const [bookingId, setBookingId] = useState('1');
  const [handoverId, setHandoverId] = useState<number | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');

  const initiatePickup = async () => {
    try {
      const data = await apiPost('/api/v1/handover/pickup/initiate', { booking_id: Number(bookingId), verification_method: 'OTP' });
      setHandoverId(data.handover_id);
      setOtpCode(data.otp_code || '');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const verifyPickup = async () => {
    if (!handoverId) return;
    try {
      await apiPost('/api/v1/handover/verify', { handover_id: handoverId, verification_code: verificationCode, verified_by: 777 });
      alert('Pickup verified. Asset status is now Rented.');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const initiateReturn = async () => {
    try {
      const result = await apiPost('/api/v1/handover/return/complete', { booking_id: Number(bookingId), condition_photos: ['https://placehold.co/300x200?text=Front'] });
      alert(`Return initiated with handover ID ${result.handover.handover_id}. Verify with generated OTP from backend.`);
    } catch (e: any) {
      alert(e.message);
    }
  };

  return <div className="min-h-screen bg-[var(--background)]"><header className="eh-header px-4 md:px-8 py-4"><div className="flex items-center gap-4"><Link to="/" className="eh-muted hover:text-[var(--primary)]"><ArrowLeft size={24} /></Link><h1 className="text-2xl font-bold text-[var(--primary)]">Digital Handover</h1></div></header><div className="max-w-2xl mx-auto p-6 space-y-4"><input value={bookingId} onChange={(e) => setBookingId(e.target.value)} type="number" className="eh-input w-full px-3 py-2 rounded" placeholder="Booking ID" /><button onClick={initiatePickup} className="eh-primary-btn w-full py-2 rounded">Initiate Pickup OTP</button>{otpCode && <div className="bg-[var(--surface-2)] border border-[var(--outline)] p-4 rounded">Generated OTP: <strong>{otpCode}</strong></div>}{handoverId && <><input value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} className="eh-input w-full px-3 py-2 rounded" placeholder="Enter OTP to verify" /><button onClick={verifyPickup} className="w-full bg-[var(--accent)] text-[var(--primary)] py-2 rounded flex items-center justify-center gap-2"><CheckCircle size={16} />Verify Pickup</button></>}<button onClick={initiateReturn} className="w-full border border-[var(--outline)] py-2 rounded">Initiate Return</button></div></div>;
}
