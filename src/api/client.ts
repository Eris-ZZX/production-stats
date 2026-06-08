const ADMIN_TOKEN_KEY = 'admin-token';
const PRODUCT_TOKEN_KEY = 'product-token';
const PRODUCT_AUTHS_KEY = 'product-auths';

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export function getProductToken(): string | null {
  return sessionStorage.getItem(PRODUCT_TOKEN_KEY);
}

export function setProductToken(token: string) {
  sessionStorage.setItem(PRODUCT_TOKEN_KEY, token);
}

export function clearProductToken() {
  sessionStorage.removeItem(PRODUCT_TOKEN_KEY);
}

export interface ProductAuth {
  productId: number;
  role: string;
  productName: string;
}

export function getProductAuths(): ProductAuth[] {
  try { return JSON.parse(sessionStorage.getItem(PRODUCT_AUTHS_KEY) || '[]'); } catch { return []; }
}

export function addProductAuth(auth: ProductAuth) {
  const auths = getProductAuths().filter(a => a.productId !== auth.productId);
  auths.push(auth);
  sessionStorage.setItem(PRODUCT_AUTHS_KEY, JSON.stringify(auths));
}

export function clearProductAuth(productId: number) {
  const auths = getProductAuths().filter(a => a.productId !== productId);
  sessionStorage.setItem(PRODUCT_AUTHS_KEY, JSON.stringify(auths));
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken() || getProductToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    // Token expired, try to clear and redirect
    if (getAdminToken()) clearAdminToken();
    if (getProductToken()) clearProductToken();
    throw new Error('登录已过期，请重新登录');
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`服务器错误 (${res.status})，请检查后端是否正常运行`);
  }
  if (!res.ok) throw new Error(data.error || `请求失败 (${res.status})`);
  return data as T;
}

export function apiGet<T>(url: string): Promise<T> {
  return request<T>(url);
}

export function apiPost<T>(url: string, body?: any): Promise<T> {
  return request<T>(url, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
}

export function apiPut<T>(url: string, body?: any): Promise<T> {
  return request<T>(url, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
}

export function apiDelete<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}
