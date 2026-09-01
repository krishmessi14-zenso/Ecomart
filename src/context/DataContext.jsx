/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useMemo, useCallback } from "react";

export const DataContext = createContext(null);

export function DataProvider({ children }) {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, [fetchProducts, fetchOrders]);

  const addProduct = useCallback(async (payload) => {
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const newProduct = await res.json();
        setProducts(prev => [newProduct, ...prev]);
        return newProduct;
      }
    } catch (err) {
      console.error("Failed to add product:", err);
    }
  }, []);

  const updateProduct = useCallback(async (id, payload) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const updatedProduct = await res.json();
        setProducts(prev => prev.map(p => p.id === id ? updatedProduct : p));
        return updatedProduct;
      }
    } catch (err) {
      console.error("Failed to update product:", err);
    }
  }, []);

  const deleteProduct = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        setProducts(prev => prev.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete product:", err);
    }
  }, []);

  const placeOrder = useCallback(async (payload) => {
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const createdData = await res.json();
        // Re-fetch all orders and products from server DB for complete sync across components
        await fetchOrders();
        await fetchProducts();
        return Array.isArray(createdData) ? createdData[0] : createdData;
      }
    } catch (err) {
      console.error("Failed to place order:", err);
    }
  }, [fetchOrders, fetchProducts]);

  const updateOrderStatus = useCallback(async (id, status) => {
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updatedOrder = await res.json();
        setOrders(prev => prev.map(o => o.id === id ? updatedOrder : o));
        return updatedOrder;
      }
    } catch (err) {
      console.error("Failed to update order status:", err);
    }
  }, []);

  const approveProduct = useCallback(async (id, status, rejectionReason) => {
    try {
      const res = await fetch(`/api/products/${id}/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason })
      });
      if (res.ok) {
        const { product } = await res.json();
        setProducts(prev => prev.map(p => p.id === id ? product : p));
        return product;
      }
    } catch (err) {
      console.error("Failed to update product approval:", err);
    }
  }, []);

  const value = useMemo(
    () => ({ products, orders, addProduct, updateProduct, deleteProduct, approveProduct, placeOrder, updateOrderStatus }),
    [products, orders, addProduct, updateProduct, deleteProduct, approveProduct, placeOrder, updateOrderStatus]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
