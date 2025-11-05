import axios from "axios";

// API base URL - adjust for production
const API_BASE_URL = "/api";

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Auth token management
export const getAuthToken = (): string | null => {
  return localStorage.getItem("auth_token");
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem("auth_token", token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("admin_data");
};

export const getAdminData = () => {
  const data = localStorage.getItem("admin_data");
  return data ? JSON.parse(data) : null;
};

export const setAdminData = (admin: any) => {
  localStorage.setItem("admin_data", JSON.stringify(admin));
};

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - remove token and redirect to login
      removeAuthToken();
      window.location.href = "/login";
    } else if (error.response?.status === 503) {
      // Service unavailable - don't redirect, let components handle gracefully
      console.warn(
        "Service temporarily unavailable:",
        error.response?.data?.error,
      );
    }
    return Promise.reject(error);
  },
);

// Auth API calls
export const authAPI = {
  checkSetupStatus: () => api.get("/auth/setup-status"),

  login: (phone: string, password: string) =>
    api.post("/auth/login", { phone, password }),

  setup: (name: string, phone: string, password: string) =>
    api.post("/auth/setup", { name, phone, password }),
};

// Client API calls
export const clientAPI = {
  getAll: (params?: any) => api.get("/clients", { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post("/clients", data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Product API calls
export const productAPI = {
  getAll: (params?: any) => api.get("/products", { params }),
  getById: (id: string) => api.get(`/products/${id}`),
  create: (data: any) => api.post("/products", data),
  update: (id: string, data: any) => api.put(`/products/${id}`, data),
  delete: (id: string) => api.delete(`/products/${id}`),
  getCategories: () => api.get("/products/categories"),
};

// Invoice API calls
export const invoiceAPI = {
  getAll: (params?: any) => api.get("/invoices", { params }),
  getById: (id: string) => api.get(`/invoices/${id}`),
  create: (data: any) => api.post("/invoices", data),
  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),
  delete: (id: string) => api.delete(`/invoices/${id}`),
  return: (id: string) => api.post(`/invoices/${id}/return`),
  downloadPDF: (id: string, lang: "en" | "hi" = "en", gst?: boolean) => {
    const params = new URLSearchParams({ lang });
    if (gst !== undefined) params.append("gst", gst.toString());

    return api.get(`/invoices/${id}/pdf?${params.toString()}`, {
      responseType: "blob",
    });
  },
};

// Payments API calls
export const paymentsAPI = {
  create: (data: any) => api.post("/payments", data),
};

// Stock API calls
export const stockAPI = {
  getCurrent: (params?: any) => api.get("/stock/current", { params }),
  getLedger: (params?: any) => api.get("/stock/ledger", { params }),
  getIssueRegister: (params?: any) => api.get("/issue-register", { params }),
  getReturnable: () => api.get("/stock/returnable"),
  updateStock: (data: any) => api.post("/stock/update", data),
};

// B2B Stock API calls
export const b2bAPI = {
  list: () => api.get("/b2b-stock"),
  create: (data: {
    itemName: string;
    quantity: number;
    price: number;
    supplierName: string;
  }) => api.post("/b2b-stock", data),
  update: (
    id: string,
    data: Partial<{
      itemName: string;
      quantity: number;
      price: number;
      supplierName: string;
      productId: string | null;
    }>,
  ) => api.put(`/b2b-stock/${id}`, data),
  remove: (id: string) => api.delete(`/b2b-stock/${id}`),
  purchase: (
    id: string,
    data: { quantity: number; price: number; supplierName: string },
  ) => api.post(`/b2b-stock/${id}/purchase`, data),
};

// Event API calls
export const eventAPI = {
  getAll: (params?: any) => api.get("/events", { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post("/events", data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
  saveAgreement: (id: string, data: any) =>
    api.put(`/events/${id}/agreement`, data),
  dispatch: (id: string, data: any) => api.post(`/events/${id}/dispatch`, data),
  return: (id: string, data: any) => api.post(`/events/${id}/return`, data),
  downloadAgreement: (id: string) =>
    api.get(`/events/${id}/agreement/pdf`, { responseType: "blob" }),
  getLastReturnSummary: (id: string) =>
    api.get(`/events/${id}/last-return-summary`),
  getFinancials: (id: string) => api.get(`/events/${id}/financials`),
};

// Leads API calls
export const leadsAPI = {
  getAll: (params?: any) => api.get("/leads", { params }),
  getById: (id: string) => api.get(`/leads/${id}`),
  create: (data: any) => api.post(`/leads`, data),
  update: (id: string, data: any) => api.put(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
  updateStatus: (id: string, status: string) =>
    api.patch(`/leads/${id}/status`, { status }),
  updateStatusByClient: (clientId: string, status: string) =>
    api.patch(`/leads/by-client/${clientId}/status`, { status }),
  updatePriority: (id: string, priority: "hot" | "cold") =>
    api.patch(`/leads/${id}/priority`, { priority }),
  updatePriorityByClient: (clientId: string, priority: "hot" | "cold") =>
    api.patch(`/leads/by-client/${clientId}/priority`, { priority }),
};

// Worker API calls
export const workerAPI = {
  getAll: (params?: any) => api.get("/workers", { params }),
  getById: (id: string) => api.get(`/workers/${id}`),
  create: (data: any) => api.post("/workers", data),
  update: (id: string, data: any) => api.put(`/workers/${id}`, data),
  delete: (id: string) => api.delete(`/workers/${id}`),
};

// Attendance API calls
export const attendanceAPI = {
  getAll: (params?: any) => api.get("/attendance", { params }),
  mark: (data: any) => api.post("/attendance", data),
};

// Payroll API calls
export const payrollAPI = {
  calculate: (workerId: string, month: string) =>
    api.get(`/payroll/${workerId}/${month}`),
  create: (data: any) => api.post("/payroll", data),
  getAll: (params?: any) => api.get("/payroll", { params }),
};

// Reports API calls
export const reportsAPI = {
  getDashboard: (params?: any) => api.get("/reports/summary", { params }),
  getTimeseries: (params?: any) => api.get("/reports/timeseries", { params }),
  getClientReport: () => api.get("/reports/clients"),
  getProductReport: () => api.get("/reports/products"),
  getMonthlyReport: (params?: any) => api.get("/reports/monthly", { params }),
};

export default api;
