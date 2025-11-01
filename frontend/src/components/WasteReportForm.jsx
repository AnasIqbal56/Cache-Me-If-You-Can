import React, { useState } from 'react';
import LocationInput from './LocationInput';

const WasteReportForm = () => {
    const [formData, setFormData] = useState({
        cropType: '',
        quantity: '',
        latitude: '',
        longitude: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleLocationChange = (location) => {
        setFormData(prev => ({
            ...prev,
            latitude: location.latitude,
            longitude: location.longitude
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/api/tools/waste/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your auth headers here
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to submit waste report');
            }

            setSuccess(true);
            // Reset form
            setFormData({
                cropType: '',
                quantity: '',
                latitude: '',
                longitude: ''
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="waste-report-form">
            <h2>Report Crop Waste</h2>
            
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Crop Type</label>
                    <select
                        value={formData.cropType}
                        onChange={(e) => setFormData(prev => ({ ...prev, cropType: e.target.value }))}
                        required
                    >
                        <option value="">Select Crop Type</option>
                        <option value="rice">Rice</option>
                        <option value="wheat">Wheat</option>
                        <option value="sugarcane">Sugarcane</option>
                        <option value="cotton">Cotton</option>
                    </select>
                </div>

                <div className="form-group">
                    <label>Quantity (kg)</label>
                    <input
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                        required
                        min="1"
                    />
                </div>

                <div className="form-group">
                    <label>Location</label>
                    <LocationInput onLocationChange={handleLocationChange} />
                </div>

                <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || !formData.latitude || !formData.longitude}
                >
                    {loading ? 'Submitting...' : 'Submit Report'}
                </button>
            </form>

            {error && (
                <div className="alert alert-danger mt-3">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success mt-3">
                    Waste report submitted successfully!
                </div>
            )}
        </div>
    );
};

export default WasteReportForm;