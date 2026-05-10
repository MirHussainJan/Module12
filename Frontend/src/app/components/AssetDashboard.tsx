import { Link } from 'react-router';
import { Search, Plus, Package, MapPin, DollarSign } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { apiGet } from '../lib/api';

export default function AssetDashboard() {
  const [assets, setAssets] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [city, setCity] = useState('All Locations');

  useEffect(() => {
    apiGet('/api/v1/assets/catalog').then(setAssets).catch(() => setAssets([]));
  }, []);

  const filteredAssets = useMemo(() => assets.filter((asset) => {
    const categoryOk = category === 'All Categories' || asset.category === category;
    const cityOk = city === 'All Locations' || asset.city === city;
    const queryOk = search.trim() === '' || asset.asset_name.toLowerCase().includes(search.toLowerCase());
    return categoryOk && cityOk && queryOk;
  }), [assets, category, city, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">EquipHub</h1>
            <p className="text-xs md:text-sm text-gray-500">Hardware & Asset Rental Platform</p>
          </div>
          <nav className="flex flex-wrap gap-3 md:gap-6 w-full md:w-auto items-center">
            <Link to="/" className="text-blue-600 font-medium text-sm md:text-base">Browse Equipment</Link>
            <Link to="/my-rentals" className="text-gray-600 hover:text-gray-900 text-sm md:text-base">My Rentals</Link>
            <Link to="/add-asset" className="bg-blue-600 text-white px-3 md:px-4 py-2 rounded-md flex items-center gap-2 text-sm md:text-base">
              <Plus size={16} className="md:w-[18px] md:h-[18px]" />
              <span className="hidden sm:inline">List Your Equipment</span>
              <span className="sm:hidden">List Equipment</span>
            </Link>
          </nav>
        </div>
      </header>

      <div className="bg-white border-b border-gray-200 px-4 md:px-8 py-4 md:py-6">
        <div className="flex flex-col md:flex-row gap-3 md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} type="text" placeholder="Search for equipment..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm md:text-base" />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="px-3 md:px-4 py-2 border border-gray-300 rounded-md bg-white text-sm md:text-base">
            <option>All Categories</option>
            <option>Photography</option>
            <option>Videography</option>
            <option>Audio</option>
            <option>Computing</option>
            <option>Design</option>
          </select>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="px-3 md:px-4 py-2 border border-gray-300 rounded-md bg-white text-sm md:text-base">
            <option>All Locations</option>
            {[...new Set(assets.map((a) => a.city))].map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="px-4 md:px-8 py-6 md:py-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm md:text-base text-gray-600">{filteredAssets.length} equipment items available</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {filteredAssets.map((asset) => (
            <Link key={asset.asset_id} to={`/asset/${asset.asset_id}`} className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 hover:shadow-lg transition-shadow">
              <div className="w-full h-40 md:h-48 bg-gray-200 rounded-md mb-3 md:mb-4 flex items-center justify-center overflow-hidden">
                {asset.images?.[0] ? <img src={asset.images[0]} className="w-full h-full object-cover" /> : <Package size={40} className="md:w-12 md:h-12 text-gray-400" />}
              </div>
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">{asset.asset_name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap flex-shrink-0 ${asset.status === 'Available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{asset.status}</span>
                </div>
                <p className="text-xs md:text-sm text-gray-500">{asset.category}</p>
                <div className="flex items-center gap-1 text-xs md:text-sm text-gray-600"><MapPin size={12} className="md:w-[14px] md:h-[14px]" /><span>{asset.city}</span></div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-blue-600 font-semibold text-sm md:text-base"><DollarSign size={16} className="md:w-[18px] md:h-[18px]" /><span>{asset.daily_rate}/day</span></div>
                  <span className="text-xs text-gray-500 hidden sm:inline">by {asset.owner_name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
