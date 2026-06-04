import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Product } from '../types';
import { mockProducts } from '../mockData';

interface ProductContextType {
  currentProduct: Product | null;
  products: Product[];
  setCurrentProduct: (p: Product) => void;
}

const ProductContext = createContext<ProductContextType>({
  currentProduct: null,
  products: [],
  setCurrentProduct: () => {},
});

export function ProductProvider({ children }: { children: ReactNode }) {
  const [currentProduct, setCurrentProduct] = useState<Product | null>(mockProducts.length > 0 ? mockProducts[0] : null);

  const handleSetProduct = useCallback((p: Product) => {
    setCurrentProduct(p);
  }, []);

  return (
    <ProductContext.Provider value={{ currentProduct, products: mockProducts, setCurrentProduct: handleSetProduct }}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProduct() {
  return useContext(ProductContext);
}
