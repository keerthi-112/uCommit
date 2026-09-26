import axios from "axios";

/**
 * Base URL for the API.
 *
 * Set VITE_API_URL at build time for anything other than local
 * development. Vite inlines it into the bundle, so a production build
 * made without it would point at the developer's own machine.
 */
export const API_URL =
  import.meta.env.VITE_API_URL ??
  "http://localhost:5000";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

export default api;
