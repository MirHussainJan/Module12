import { BrowserRouter, Routes, Route } from 'react-router';
import AssetDashboard from './components/AssetDashboard';
import AddAsset from './components/AddAsset';
import AssetDetail from './components/AssetDetail';
import DigitalHandover from './components/DigitalHandover';
import MyRentals from './components/MyRentals';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AssetDashboard />} />
        <Route path="/add-asset" element={<AddAsset />} />
        <Route path="/asset/:id" element={<AssetDetail />} />
        <Route path="/handover" element={<DigitalHandover />} />
        <Route path="/my-rentals" element={<MyRentals />} />
      </Routes>
    </BrowserRouter>
  );
}