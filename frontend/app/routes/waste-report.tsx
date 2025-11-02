import type { Route } from "./+types/waste-report";
import { useState } from "react";
import { Link } from "react-router";
import { getCurrentLocation } from "../utils/geolocation";
import { API_ENDPOINTS, apiRequest } from "../config/api";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Report Crop Waste - FreshHarvest" },
    { name: "description", content: "Report crop waste for recycling" },
  ];
}

type LocationData = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

export default function WasteReport() {
  const [isAuthenticated] = useState(() => {
    return typeof window !== 'undefined' && 
           localStorage.getItem('isAuthenticated') === 'true' &&
           localStorage.getItem('userRole') === 'seller';
  });

  const [formData, setFormData] = useState({
    cropType: '',
    quantity: '',
    latitude: '',
    longitude: ''
  });

  const [location, setLocation] = useState<LocationData | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleGetLocation = async () => {
    try {
      setLoadingLocation(true);
      setLocationError(null);
      const position = await getCurrentLocation();
      setLocation(position);
      setFormData(prev => ({
        ...prev,
        latitude: position.latitude.toString(),
        longitude: position.longitude.toString()
      }));
    } catch (err: any) {
      setLocationError('Failed to get location. Please ensure location permissions are enabled.');
      console.error('Location error:', err);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest(API_ENDPOINTS.WASTE_REPORT, {
        method: 'POST',
        body: JSON.stringify({
          cropType: formData.cropType,
          quantity: parseFloat(formData.quantity),
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude)
        })
      });

      console.log('Waste report submitted:', response);
      setSuccess(true);
      
      // Reset form
      setFormData({
        cropType: '',
        quantity: '',
        latitude: '',
        longitude: ''
      });
      setLocation(null);
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit waste report');
    } finally {
      setLoading(false);
    }
  };

  // Show authentication message if not logged in as seller
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background-50 flex items-center justify-center px-4">
        <div className="card bg-white shadow-xl max-w-lg w-full text-center">
          <div className="text-6xl mb-6">🚫</div>
          <h1 className="text-2xl md:text-3xl font-bold text-text-900 mb-3">
            Access Restricted
          </h1>
          <p className="text-sm md:text-base text-text-600 mb-6">
            This feature is only accessible to registered farmers/sellers.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/login" className="btn-primary text-sm font-semibold uppercase tracking-widest">
              🌾 LOGIN AS FARMER
            </Link>
            <Link to="/farmer-dashboard" className="btn-outline text-sm font-semibold uppercase tracking-widest">
              ← BACK TO DASHBOARD
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-50 pb-16">
      {/* Header Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-text-200">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <Link to="/farmer-dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div className="flex items-center gap-1 text-2xl">
                <span>🌾</span>
                <span>♻️</span>
                <span>🌱</span>
              </div>
              <h1 className="text-xl font-bold text-primary-700">Waste Reporting</h1>
            </Link>
            <nav className="flex items-center gap-3">
              <Link to="/farmer-dashboard" className="text-sm text-text-600 hover:text-primary-700 transition-colors font-medium">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <section className="container-page max-w-3xl space-y-8 mt-8">
        {/* Page Header */}
        <header className="space-y-3">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary-700">
            <span>♻️</span>
            <span>Crop Waste Reporting</span>
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-text-900">
            Report Crop Waste for Recycling
          </h1>
          <p className="text-sm md:text-base text-text-600">
            Help us track and recycle agricultural waste. Your report contributes to sustainable farming practices.
          </p>
        </header>

        {/* Success Message */}
        {success && (
          <div className="card bg-mint-50 border-2 border-mint-500">
            <div className="flex items-start gap-3">
              <span className="text-4xl">✅</span>
              <div>
                <h3 className="font-bold text-primary-900 text-lg mb-1">Report Submitted Successfully!</h3>
                <p className="text-sm text-primary-800">
                  Your waste report has been recorded. Thank you for contributing to sustainable farming practices!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="card bg-red-50 border-2 border-red-500">
            <div className="flex items-start gap-3">
              <span className="text-4xl">⚠️</span>
              <div>
                <h3 className="font-bold text-red-900 text-lg mb-1">Oops! Something went wrong</h3>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Waste Report Form */}
        <div className="card bg-white shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <div className="text-3xl">�️</div>
            <h2 className="text-xl font-bold text-text-900">Waste Details</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Crop Type */}
            <div>
              <label htmlFor="cropType" className="label-field">
                🌾 CROP TYPE
              </label>
              <select
                id="cropType"
                value={formData.cropType}
                onChange={(e) => setFormData(prev => ({ ...prev, cropType: e.target.value }))}
                className="input-field"
                required
                disabled={loading}
              >
                <option value="">Select Crop Type</option>
                <option value="rice">Rice</option>
                <option value="wheat">Wheat</option>
                <option value="sugarcane">Sugarcane</option>
                <option value="cotton">Cotton</option>
                <option value="corn">Corn</option>
                <option value="soybean">Soybean</option>
                <option value="potato">Potato</option>
                <option value="tomato">Tomato</option>
                <option value="onion">Onion</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Quantity */}
            <div>
              <label htmlFor="quantity" className="label-field">
                ⚖️ QUANTITY (KG)
              </label>
              <input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity in kilograms"
                className="input-field"
                required
                min="1"
                step="0.1"
                disabled={loading}
              />
            </div>

            {/* Location */}
            <div>
              <label className="label-field mb-3">
                📍 LOCATION
              </label>
              
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={loadingLocation || loading}
                className={`btn-outline w-full mb-4 flex items-center justify-center gap-2 ${
                  loadingLocation ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {loadingLocation ? (
                  <>
                    <span className="animate-spin text-xl">⏳</span>
                    <span>Getting Location...</span>
                  </>
                ) : (
                  <>
                    <span>📍</span>
                    <span>Get Current Location</span>
                  </>
                )}
              </button>

              {location && (
                <div className="card bg-mint-50 border-mint-300 mb-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-text-600 font-medium">Latitude:</span>
                      <span className="text-text-900 font-semibold">{location.latitude.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-600 font-medium">Longitude:</span>
                      <span className="text-text-900 font-semibold">{location.longitude.toFixed(6)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-text-600 font-medium">Accuracy:</span>
                      <span className="text-text-900 font-semibold">{Math.round(location.accuracy)}m</span>
                    </div>
                  </div>
                </div>
              )}

              {locationError && (
                <div className="card bg-red-50 border-red-300">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{locationError}</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="latitude" className="text-sm font-semibold text-text-700 mb-2 block">
                    Latitude
                  </label>
                  <input
                    id="latitude"
                    type="number"
                    value={formData.latitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, latitude: e.target.value }))}
                    placeholder="Auto-filled"
                    className="input-field"
                    required
                    step="any"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="longitude" className="text-sm font-semibold text-text-700 mb-2 block">
                    Longitude
                  </label>
                  <input
                    id="longitude"
                    type="number"
                    value={formData.longitude}
                    onChange={(e) => setFormData(prev => ({ ...prev, longitude: e.target.value }))}
                    placeholder="Auto-filled"
                    className="input-field"
                    required
                    step="any"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-widest"
              disabled={loading || !formData.latitude || !formData.longitude}
            >
              {loading ? (
                <>
                  <span className="animate-spin text-xl">⏳</span>
                  <span>SUBMITTING...</span>
                </>
              ) : (
                <>
                  <span>♻️ SUBMIT REPORT</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Info Card */}
        <div className="card bg-primary-50 border-primary-300">
          <div className="flex items-start gap-3">
            <span className="text-3xl">💡</span>
            <div className="text-sm">
              <h3 className="font-bold text-text-900 mb-2">Why Report Crop Waste?</h3>
              <ul className="space-y-1 text-text-700">
                <li>• Helps track agricultural waste for recycling initiatives</li>
                <li>• Contributes to sustainable farming practices</li>
                <li>• Enables better waste management planning</li>
                <li>• Supports circular economy in agriculture</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
