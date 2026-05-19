import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = useAuthStore.getState().token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { data } = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        useAuthStore.getState().setToken(newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch {
        useAuthStore.getState().logout();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  verifyEmail: (email: string, otp: string) => api.post('/auth/verify-email', { email, otp }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) => api.post('/auth/reset-password', { token, password }),
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
  changePassword: (data: any) => api.put('/auth/change-password', data),
};

export const emergencyApi = {
  create: (data: any) => api.post('/emergency', data),
  getAll: (params?: any) => api.get('/emergency', { params }),
  getById: (id: string) => api.get(`/emergency/${id}`),
  getMy: () => api.get('/emergency/my'),
  updateStatus: (id: string, status: string) => api.put(`/emergency/${id}/status`, { status }),
  assign: (id: string, data: any) => api.put(`/emergency/${id}/assign`, data),
  overridePriority: (id: string, data: any) => api.post(`/emergency/${id}/priority`, data),
};

export const resourceApi = {
  getAll: (params?: any) => api.get('/resources', { params }),
  getAvailability: () => api.get('/resources/availability'),
  getById: (id: string) => api.get(`/resources/${id}`),
  create: (data: any) => api.post('/resources', data),
  update: (id: string, data: any) => api.put(`/resources/${id}`, data),
  delete: (id: string) => api.delete(`/resources/${id}`),
  getByHospital: (hospitalId: string) => api.get(`/resources/hospital/${hospitalId}`),
};

export const searchApi = {
  searchHospitals: (params?: any) => api.get('/search/hospitals', { params }),
  getHospitalDetails: (id: string) => api.get(`/search/hospitals/${id}`),
  getRecommendations: (params?: any) => api.get('/search/recommendations', { params }),
};

export const reservationApi = {
  create: (data: any) => api.post('/reservations', data),
  getMy: () => api.get('/reservations/my'),
  getAll: (params?: any) => api.get('/reservations', { params }),
  getById: (id: string) => api.get(`/reservations/${id}`),
  confirm: (id: string) => api.put(`/reservations/${id}/confirm`),
  cancel: (id: string, reason?: string) => api.put(`/reservations/${id}/cancel`, { reason }),
  complete: (id: string) => api.put(`/reservations/${id}/complete`),
};

export const ambulanceApi = {
  getAll: (params?: any) => api.get('/ambulances', { params }),
  getById: (id: string) => api.get(`/ambulances/${id}`),
  create: (data: any) => api.post('/ambulances', data),
  dispatch: (id: string, emergencyId: string) => api.put(`/ambulances/${id}/dispatch`, { emergencyId }),
  updateLocation: (id: string, latitude: number, longitude: number) =>
    api.put(`/ambulances/${id}/location`, { latitude, longitude }),
  updateStatus: (id: string, status: string) => api.put(`/ambulances/${id}/status`, { status }),
  getByEmergency: (emergencyId: string) => api.get(`/ambulances/emergency/${emergencyId}`),
};

export const bloodApi = {
  getStock: (params?: any) => api.get('/blood/stock', { params }),
  updateStock: (hospitalId: string, data: any) => api.put(`/blood/stock/${hospitalId}`, data),
  createRequest: (data: any) => api.post('/blood/requests', data),
  getRequests: (params?: any) => api.get('/blood/requests', { params }),
  getRequestById: (id: string) => api.get(`/blood/requests/${id}`),
  fulfillRequest: (id: string) => api.put(`/blood/requests/${id}/fulfill`),
  cancelRequest: (id: string) => api.put(`/blood/requests/${id}/cancel`),
};

export const notificationApi = {
  getAll: (params?: any) => api.get('/notifications', { params }),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
};

export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUserDetails: (id: string) => api.get(`/admin/users/${id}`),
  updateUserStatus: (id: string, status: string) => api.put(`/admin/users/${id}/status`, { status }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  createHospital: (data: any) => api.post('/admin/hospitals', data),
  updateHospital: (id: string, data: any) => api.put(`/admin/hospitals/${id}`, data),
  deleteHospital: (id: string) => api.delete(`/admin/hospitals/${id}`),
  updateHospitalBeds: (id: string, data: any) => api.put(`/admin/hospitals/${id}/beds`, data),
  generateReport: (data: any) => api.post('/admin/reports', data),
  getReports: (params?: any) => api.get('/admin/reports', { params }),
  getReport: (id: string) => api.get(`/admin/reports/${id}`),
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
  broadcastAlert: (data: any) => api.post('/admin/broadcast', data),
};
