import React, { useState, useEffect } from 'react';
import { getCurrentLocation } from '../utils/geolocation';

const LocationInput = ({ onLocationChange }) => {
    const [location, setLocation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleGetLocation = async () => {
        try {
            setLoading(true);
            setError(null);
            const position = await getCurrentLocation();
            setLocation(position);
            onLocationChange(position);
        } catch (err) {
            setError('Failed to get location. Please ensure location permissions are enabled.');
            console.error('Location error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="location-input">
            <button 
                onClick={handleGetLocation}
                disabled={loading}
                className={`btn ${loading ? 'btn-secondary' : 'btn-primary'}`}
            >
                {loading ? 'Getting Location...' : 'Get Current Location'}
            </button>
            
            {location && (
                <div className="location-details mt-2">
                    <p>Latitude: {location.latitude}</p>
                    <p>Longitude: {location.longitude}</p>
                    <p>Accuracy: {Math.round(location.accuracy)}m</p>
                </div>
            )}
            
            {error && (
                <div className="alert alert-danger mt-2">
                    {error}
                </div>
            )}
        </div>
    );
};

export default LocationInput;