import axios from 'axios';

// Function to get coordinates from address
export const getCoordinatesFromAddress = async (address) => {
    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        if (response.data.status === 'OK') {
            const { lat, lng } = response.data.results[0].geometry.location;
            return { latitude: lat, longitude: lng };
        }
        throw new Error('Could not get coordinates for address');
    } catch (error) {
        throw new Error('Geocoding failed: ' + error.message);
    }
};

// Function to get address from coordinates
export const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
        );

        if (response.data.status === 'OK') {
            return response.data.results[0].formatted_address;
        }
        throw new Error('Could not get address for coordinates');
    } catch (error) {
        throw new Error('Reverse geocoding failed: ' + error.message);
    }
};