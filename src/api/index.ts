import { apiGet, apiPost, apiPut, apiDelete } from './client';

const BASE = '/api';

// ===== Auth =====
export const authApi = {
  adminLogin: (username: string, password: string) =>
    apiPost<{ token: string; role: string; username: string }>(`${BASE}/auth/admin-login`, { username, password }),

  productLogin: (productId: number, password: string) =>
    apiPost<{ token: string; role: string; product: { id: number; name: string } }>(`${BASE}/auth/product-login`, { productId, password }),
};

// ===== Product Lines =====
export const productLinesApi = {
  list: () => apiGet<any[]>(`${BASE}/product-lines`),
  create: (data: any) => apiPost<any>(`${BASE}/product-lines`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/product-lines/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/product-lines/${id}`),
  listSkus: (productLineId?: number) => apiGet<any[]>(productLineId ? `${BASE}/product-lines/${productLineId}/skus` : `${BASE}/product-lines/skus/all`),
  createSku: (data: { productLineId: number; code: string }) => apiPost<any>(`${BASE}/product-lines/skus`, data),
  updateSku: (id: number, data: any) => apiPut<any>(`${BASE}/product-lines/skus/${id}`, data),
  removeSku: (id: number) => apiDelete<any>(`${BASE}/product-lines/skus/${id}`),
};

// ===== Stations =====
export const stationsApi = {
  list: () => apiGet<any[]>(`${BASE}/stations`),
  create: (data: any) => apiPost<any>(`${BASE}/stations`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/stations/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/stations/${id}`),
  reorder: (items: { id: number; sortOrder: number }[]) => apiPut<any>(`${BASE}/stations/reorder/bulk`, { items }),
};

// ===== Defect Codes =====
export const defectCodesApi = {
  list: () => apiGet<any[]>(`${BASE}/defect-codes`),
  create: (data: any) => apiPost<any>(`${BASE}/defect-codes`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/defect-codes/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/defect-codes/${id}`),
};

// ===== Defect Fields =====
export const defectFieldsApi = {
  list: () => apiGet<any[]>(`${BASE}/defect-fields`),
  create: (data: any) => apiPost<any>(`${BASE}/defect-fields`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/defect-fields/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/defect-fields/${id}`),
};

// ===== Station Fields =====
export const stationFieldsApi = {
  list: () => apiGet<any[]>(`${BASE}/station-fields`),
  create: (data: any) => apiPost<any>(`${BASE}/station-fields`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/station-fields/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/station-fields/${id}`),
};

// ===== Production Records =====
export const productionRecordsApi = {
  list: (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const q = qs.toString();
    return apiGet<any[]>(`${BASE}/production-records${q ? '?' + q : ''}`);
  },
  create: (data: any) => apiPost<any>(`${BASE}/production-records`, data),
  batchCreate: (records: any[]) => apiPost<any>(`${BASE}/production-records/batch`, { records }),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/production-records/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/production-records/${id}`),
};

// ===== Station Details =====
export const stationDetailsApi = {
  list: (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const q = qs.toString();
    return apiGet<any[]>(`${BASE}/station-details${q ? '?' + q : ''}`);
  },
  create: (data: any) => apiPost<any>(`${BASE}/station-details`, data),
  batchCreate: (records: any[]) => apiPost<any>(`${BASE}/station-details/batch`, { records }),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/station-details/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/station-details/${id}`),
};

// ===== Inspection Records =====
export const inspectionRecordsApi = {
  list: (params?: { startDate?: string; endDate?: string }) => {
    const qs = new URLSearchParams();
    if (params?.startDate) qs.set('startDate', params.startDate);
    if (params?.endDate) qs.set('endDate', params.endDate);
    const q = qs.toString();
    return apiGet<any[]>(`${BASE}/inspection-records${q ? '?' + q : ''}`);
  },
  create: (data: any) => apiPost<any>(`${BASE}/inspection-records`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/inspection-records/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/inspection-records/${id}`),
};

// ===== Admin Accounts =====
export const adminAccountsApi = {
  list: () => apiGet<any[]>(`${BASE}/admin-accounts`),
  create: (data: any) => apiPost<any>(`${BASE}/admin-accounts`, data),
  update: (id: number, data: any) => apiPut<any>(`${BASE}/admin-accounts/${id}`, data),
  remove: (id: number) => apiDelete<any>(`${BASE}/admin-accounts/${id}`),
};

// ===== Dashboard =====
export const dashboardApi = {
  stationFpy: (params: { skuIds?: string; startDate?: string; endDate?: string }) =>
    apiGet<any[]>(`${BASE}/dashboard/station-fpy?${new URLSearchParams(params as any)}`),
  sectionFpy: (params: { skuIds?: string; startDate?: string; endDate?: string }) =>
    apiGet<any[]>(`${BASE}/dashboard/section-fpy?${new URLSearchParams(params as any)}`),
  fqcFpy: (params: { skuIds?: string; startDate?: string; endDate?: string }) =>
    apiGet<any[]>(`${BASE}/dashboard/fqc-fpy?${new URLSearchParams(params as any)}`),
  topDefects: (params: { section: string; skuIds?: string; startDate?: string; endDate?: string; defectType?: string; topN?: number }) =>
    apiGet<any[]>(`${BASE}/dashboard/top-defects?${new URLSearchParams(params as any)}`),
  stationTrend: (params: { skuIds?: string; startDate?: string; endDate?: string; defectType?: string }) =>
    apiGet<any>(`${BASE}/dashboard/station-trend?${new URLSearchParams(params as any)}`),
  sectionTrend: (params: { skuIds?: string; startDate?: string; endDate?: string; defectType?: string }) =>
    apiGet<any>(`${BASE}/dashboard/section-trend?${new URLSearchParams(params as any)}`),
  defectTrend: (params: { skuIds?: string; startDate?: string; endDate?: string; topN?: number }) =>
    apiGet<any>(`${BASE}/dashboard/defect-trend?${new URLSearchParams(params as any)}`),
};
