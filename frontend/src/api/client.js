import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { Accept: 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    const hadToken = !!localStorage.getItem('token');

    // Kick ke landing hanya saat sesi token expired/invalid pada request
    // terautentikasi — BUKAN saat gagal login (401 memang expected).
    if (error.response?.status === 401 && !isLoginRequest && hadToken) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default apiClient;