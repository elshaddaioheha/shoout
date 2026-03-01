import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { auth } from '../firebaseConfig';

/**
 * Determine the correct backend API URL dynamically so that it works across
 * iOS Simulators, Android Emulators (10.0.2.2), and physical devices (Expo Go LAN IP).
 */
const getApiUrl = () => {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // Attempt to parse your local machine's IP address dynamically via Expo Go
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
        const ip = hostUri.split(':')[0];
        if (ip.match(/^[0-9.]+$/)) {
            return `http://${ip}:3000/api/v1`; // Assuming your backend runs on port 3000
        }
    }

    // Fallbacks for standard emulation Environments
    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:3000/api/v1';
    }

    return 'http://localhost:3000/api/v1'; // iOS Simulator or Web Default
};

const API_URL = getApiUrl();

export const fetchWithAuth = async (endpoint: string, options: RequestInit = {}) => {
    const user = auth.currentUser;
    let token = '';

    if (user) {
        // Force refresh token if needed, or just get cached
        token = await user.getIdToken();
    }

    const headers = new Headers(options.headers || {});
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        throw new Error(errorData.message || 'API request failed');
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : {};
};
