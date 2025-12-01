import axios from "axios";
import { useAuthStore } from "../store/authStore";

// Ortak API client: login sonrası alınan token'ı tüm isteklere ekler
export const apiClient = axios.create({
  baseURL: "/api"
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});


