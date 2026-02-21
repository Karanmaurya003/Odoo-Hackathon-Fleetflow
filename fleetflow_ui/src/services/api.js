import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  baseURL: 'http://127.0.0.1:5000/api',
  withCredentials: true,          // send session cookie with every request
  headers: { 'Content-Type': 'application/json' },
});

// ── Interceptor: surface error messages cleanly ───────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    const msg =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Unknown error';
    return Promise.reject(new Error(msg));
  }
);

// ══════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════
export const authAPI = {
  login:    (email, password) => api.post('/auth/login',    { email, password }),
  logout:   ()               => api.post('/auth/logout'),
  register: (data)           => api.post('/auth/register',  data),
  me:       ()               => api.get('/auth/me'),
};

// ══════════════════════════════════════════════════════════════════════════
// VEHICLES
// ══════════════════════════════════════════════════════════════════════════
export const vehiclesAPI = {
  list:   (params)     => api.get('/vehicles/',       { params }),
  get:    (id)         => api.get(`/vehicles/${id}`),
  create: (data)       => api.post('/vehicles/',       data),
  update: (id, data)   => api.put(`/vehicles/${id}`,   data),
  delete: (id)         => api.delete(`/vehicles/${id}`),
  retire: (id)         => api.post(`/vehicles/${id}/retire`),
};

// ══════════════════════════════════════════════════════════════════════════
// DRIVERS
// ══════════════════════════════════════════════════════════════════════════
export const driversAPI = {
  list:    (params)   => api.get('/drivers/',         { params }),
  get:     (id)       => api.get(`/drivers/${id}`),
  create:  (data)     => api.post('/drivers/',         data),
  update:  (id, data) => api.put(`/drivers/${id}`,     data),
  delete:  (id)       => api.delete(`/drivers/${id}`),
  suspend: (id)       => api.post(`/drivers/${id}/suspend`),
};

// ══════════════════════════════════════════════════════════════════════════
// TRIPS
// ══════════════════════════════════════════════════════════════════════════
export const tripsAPI = {
  list:     (params)   => api.get('/trips/',           { params }),
  get:      (id)       => api.get(`/trips/${id}`),
  create:   (data)     => api.post('/trips/',           data),
  complete: (id, data) => api.post(`/trips/${id}/complete`, data),
  cancel:   (id)       => api.post(`/trips/${id}/cancel`),
};

// ══════════════════════════════════════════════════════════════════════════
// FUEL LOGS
// ══════════════════════════════════════════════════════════════════════════
export const fuelAPI = {
  list:   (params)   => api.get('/fuel/',             { params }),
  create: (data)     => api.post('/fuel/',             data),
  update: (id, data) => api.put(`/fuel/${id}`,         data),
  delete: (id)       => api.delete(`/fuel/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════
// MAINTENANCE
// ══════════════════════════════════════════════════════════════════════════
export const maintenanceAPI = {
  list:     (params)   => api.get('/maintenance/',       { params }),
  create:   (data)     => api.post('/maintenance/',       data),
  complete: (id)       => api.post(`/maintenance/${id}/complete`),
  delete:   (id)       => api.delete(`/maintenance/${id}`),
};

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS
// ══════════════════════════════════════════════════════════════════════════
export const analyticsAPI = {
  dashboard:         ()       => api.get('/analytics/dashboard'),
  utilization:       ()       => api.get('/analytics/utilization'),
  fuelEfficiency:    (params) => api.get('/analytics/fuel-efficiency',     { params }),
  operationalCost:   (params) => api.get('/analytics/operational-cost',    { params }),
  roi:               ()       => api.get('/analytics/roi'),
  alerts:            ()       => api.get('/analytics/alerts'),
  licenseAlerts:     (params) => api.get('/analytics/alerts/licenses',     { params }),
  costPerKm:         (params) => api.get('/analytics/cost-per-km',         { params }),
  topRevenue:        (params) => api.get('/analytics/top-revenue-vehicles',{ params }),
  monthlyFuel:       (params) => api.get('/analytics/fuel/monthly',        { params }),
  exportFull:        ()       => window.open('/api/analytics/export/full',          '_blank'),
  exportCostKm:      ()       => window.open('/api/analytics/export/cost-per-km',   '_blank'),
  exportTopRevenue:  ()       => window.open('/api/analytics/export/top-revenue',   '_blank'),
  exportMonthlyFuel: ()       => window.open('/api/analytics/export/monthly-fuel',  '_blank'),
  exportLicenseAlerts:()      => window.open('/api/analytics/export/license-alerts','_blank'),
};

export default api;
