import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { apiPost } from '../lib/api';

export default function AddAsset() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    setLoading(true);
    try {
      await apiPost('/api/v1/assets', {
        asset_name: form.get('asset_name'),
        category: form.get('category'),
        description: form.get('description'),
        condition: form.get('condition'),
        daily_rate: Number(form.get('daily_rate')),
        security_deposit: Number(form.get('security_deposit')),
        pickup_location: form.get('pickup_location'),
        city: form.get('city'),
        requires_advance_booking: form.get('requires_advance_booking') === 'on',
        images: ['https://placehold.co/600x400?text=Asset'],
      });
      alert('Asset listed successfully!');
      navigate('/');
    } catch (error: any) {
      alert(error.message || 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center gap-3 md:gap-4"><Link to="/" className="text-gray-600 hover:text-gray-900"><ArrowLeft size={20} className="md:w-6 md:h-6" /></Link><div><h1 className="text-lg md:text-2xl font-bold text-gray-900">List Your Equipment</h1></div></div>
      </header>
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4 md:p-8 space-y-4">
          <input name="asset_name" required placeholder="Equipment Name" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <select name="category" required className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"><option value="">Category</option><option>Photography</option><option>Videography</option><option>Audio</option><option>Computing</option><option>Design</option><option>Other</option></select>
            <select name="condition" required className="w-full px-4 py-2 border border-gray-300 rounded-md bg-white"><option value="">Condition</option><option>Brand New</option><option>Excellent</option><option>Good</option><option>Fair</option></select>
          </div>
          <textarea name="description" required rows={4} placeholder="Description" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input name="daily_rate" type="number" required placeholder="Daily Rate (PKR)" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
            <input name="security_deposit" type="number" required placeholder="Security Deposit (PKR)" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          </div>
          <input name="pickup_location" required placeholder="Pickup Location" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          <input name="city" required placeholder="City" className="w-full px-4 py-2 border border-gray-300 rounded-md" />
          <label className="flex items-center gap-2"><input type="checkbox" name="requires_advance_booking" className="w-4 h-4" /><span>Require advance booking</span></label>
          <div className="flex gap-3"><button type="button" onClick={() => navigate('/')} className="px-6 py-2 border border-gray-300 rounded-md">Cancel</button><button disabled={loading} type="submit" className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-md">{loading ? 'Saving...' : 'List Equipment'}</button></div>
        </form>
      </div>
    </div>
  );
}
