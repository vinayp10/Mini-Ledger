import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your computer's Wi-Fi IP: 10.230.32.103
// Physical phones connect through this IP on port 5000
const getBaseUrl = () => {
  return 'http://10.230.32.103:5000/api';
};

const client = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

client.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('miniledger_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Failed to retrieve token', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default client;

