import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';

export default function MyRentals() {
  const [rentals, setRentals] = useState<{ asRenter: any[]; asOwner: any[] }>({ asRenter: [], asOwner: [] });

  useEffect(() => {
    apiGet('/api/v1/rentals?user_id=777').then(setRentals).catch(() => setRentals({ asRenter: [], asOwner: [] }));
  }, []);

  return <div className="min-h-screen bg-gray-50"><header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4"><div className="flex items-center gap-4"><Link to="/" className="text-gray-600 hover:text-gray-900"><ArrowLeft size={24} /></Link><h1 className="text-2xl font-bold text-gray-900">My Rentals</h1></div></header><div className="px-4 md:px-8 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6"><div><h2 className="text-xl font-semibold mb-4">Equipment I'm Renting</h2><div className="space-y-3">{rentals.asRenter.map((r) => <div key={r.id} className="bg-white border rounded p-4"><p className="font-semibold">{r.assetName}</p><p className="text-sm">{r.startDate} to {r.endDate}</p><p className="text-sm">Status: {r.status}</p></div>)}</div></div><div><h2 className="text-xl font-semibold mb-4">My Equipment on Rent</h2><div className="space-y-3">{rentals.asOwner.map((r) => <div key={r.id} className="bg-white border rounded p-4"><p className="font-semibold">{r.assetName}</p><p className="text-sm">{r.startDate} to {r.endDate}</p><p className="text-sm">Status: {r.status}</p></div>)}</div></div></div></div>;
}
