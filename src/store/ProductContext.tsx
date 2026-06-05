import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { ProductRole } from '../types';
import { productLinesApi } from '../api';
import { getProductToken, getProductAuths, addProductAuth, clearProductAuth } from '../api/client';

interface ProductContextType {
  currentProduct: { id: number; name: string } | null;
  products: { id: number; name: string; isActive: boolean }[];
  currentRole: ProductRole | null;
  setCurrentProduct: (p: { id: number; name: string }) => void;
  loginProduct: (productId: number, role: ProductRole, productName: string) => void;
  logoutProduct: () => void;
  refresh: () => void;
}

const ProductContext = createContext<ProductContextType>({
  currentProduct: null, products: [], currentRole: null,
  setCurrentProduct: () => {}, loginProduct: () => {}, logoutProduct: () => {}, refresh: () => {},
});

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<{ id: number; name: string; isActive: boolean }[]>([]);
  const [currentProduct, setCurrentProduct] = useState<{ id: number; name: string } | null>(null);
  const [currentRole, setCurrentRole] = useState<ProductRole | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await productLinesApi.list();
      setProducts(list);
    } catch {
      // Product lines list is public, can fail silently
    }
  }, []);

  // Restore last auth on mount
  useEffect(() => {
    const auths = getProductAuths();
    if (auths.length > 0) {
      const last = auths[auths.length - 1];
      setCurrentProduct({ id: last.productId, name: last.productName });
      setCurrentRole(last.role as ProductRole);
    }
    refresh();
  }, [refresh]);

  const loginProduct = useCallback((productId: number, role: ProductRole, productName: string) => {
    setCurrentProduct({ id: productId, name: productName });
    setCurrentRole(role);
    addProductAuth({ productId, role, productName });
  }, []);

  const logoutProduct = useCallback(() => {
    if (currentProduct) {
      clearProductAuth(currentProduct.id);
    }
    setCurrentProduct(null);
    setCurrentRole(null);
  }, [currentProduct]);

  return (
    <ProductContext.Provider value={{ currentProduct, products, currentRole, setCurrentProduct, loginProduct, logoutProduct, refresh }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  return useContext(ProductContext);
}
