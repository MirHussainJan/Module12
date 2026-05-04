import { Link, useParams, useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Shield, Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState(0);

  useEffect(() => {
    apiGet(`/api/v1/assets/${id}`).then(setAsset).catch(() => setAsset(null));
  }, [id]);

  const calculateDays = (start: string, end: string) => {
    if (start && end) {
      const diffDays = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24));
      setDays(diffDays > 0 ? diffDays : 0);
    }
  };

  const handleBooking = async () => {
    if (!asset || !startDate || !endDate || days <= 0) return alert('Please select valid rental dates');

    try {
      const booking = await apiPost('/api/v1/bookings/create', { asset_id: asset.asset_id, renter_id: 777, start_date: startDate, end_date: endDate });
      await apiPost(`/api/v1/bookings/${booking.booking_id}/confirm-payment`, { escrow_transaction_id: `ESC-${Date.now()}` }, 'PUT');
      alert(`Booking confirmed. Escrow hold: PKR ${booking.escrow_amount_required}`);
      navigate('/handover');
    } catch (error: any) {
      alert(error.message || 'Booking failed');
    }
  };

  if (!asset) return <div className="p-8">Loading asset...</div>;

  return <div className="min-h-screen bg-gray-50"><header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4"><div className="flex items-center gap-4"><Link to="/" className="text-gray-600 hover:text-gray-900"><ArrowLeft size={24} /></Link><div><h1 className="text-2xl font-bold text-gray-900">Equipment Details</h1></div></div></header><div className="px-4 md:px-8 py-6 md:py-8"><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="lg:col-span-2 space-y-6"><div className="bg-white rounded-lg border border-gray-200 p-4"><img src={asset.images?.[0] || 'https://placehold.co/900x450?text=Asset'} className="w-full h-96 object-cover rounded-md mb-4" /><h2 className="text-xl font-semibold mb-2">Description</h2><p className="text-gray-700">{asset.description}</p></div></div><div><div className="bg-white rounded-lg border border-gray-200 p-6"><h2 className="text-2xl font-bold mb-2">{asset.asset_name}</h2><div className="flex items-center gap-1 text-gray-600 mb-3"><MapPin size={16} /><span className="text-sm">{asset.pickup_location}</span></div><div className="space-y-3 mb-6"><div className="flex justify-between"><span>Daily Rate</span><span className="font-bold text-blue-600">PKR {asset.daily_rate}</span></div><div className="flex justify-between"><span>Security Deposit</span><span className="font-semibold">PKR {asset.security_deposit}</span></div></div><div className="space-y-3 mb-6"><label className="block text-sm font-medium"><Calendar size={14} className="inline mr-2" />Start Date</label><input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); calculateDays(e.target.value, endDate); }} min={new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-md" /><label className="block text-sm font-medium"><Calendar size={14} className="inline mr-2" />End Date</label><input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); calculateDays(startDate, e.target.value); }} min={startDate || new Date().toISOString().split('T')[0]} className="w-full px-4 py-2 border border-gray-300 rounded-md" /></div>{days > 0 && <div className="bg-blue-50 rounded-lg p-4 mb-6"><div className="flex justify-between"><span>{days} days</span><span>PKR {(asset.daily_rate * days) + asset.security_deposit}</span></div></div>}<button onClick={handleBooking} className="w-full bg-blue-600 text-white py-3 rounded-md font-semibold hover:bg-blue-700">Book Equipment</button><div className="flex items-start gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-md mt-4"><Shield size={14} className="text-blue-600" /><p>Payment is secured via escrow until return verification.</p></div></div></div></div></div></div>;
}
