/* eslint-disable react-refresh/only-export-components */
import { createContext, useMemo, useCallback } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage("em_auth_user", null);
  const [role, setRole] = useLocalStorage("em_role", null); // LocalStorage compatibility for role checks

  const currentCustomerProfile = useMemo(() => {
    if (user && role === "customer") {
      return { id: user.id, name: user.name };
    }
    return null;
  }, [user, role]);

  const currentVendorProfile = useMemo(() => {
    if (user && role === "vendor") {
      return {
        id: user.id,
        name: user.name,
        storeName: user.storeName || "My Store",
        region: user.region || "",
      };
    }
    return null;
  }, [user, role]);

  const login = useCallback(async (email, password, selectedRole) => {
    const payload = { email, password };
    if (selectedRole) payload.role = selectedRole;

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Invalid email or password.");
    }

    const authUser = await response.json();
    setUser(authUser);
    setRole(authUser.role);
    return authUser;
  }, [setUser, setRole]);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    try {
      localStorage.removeItem("em_auth_user");
      localStorage.removeItem("em_role");
      localStorage.removeItem("em_cart_state");
    } catch {
      /* noop */
    }
  }, [setUser, setRole]);

  const register = useCallback(async (payload) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to register.");
    }

    const authUser = await response.json();
    setUser(authUser);
    setRole(authUser.role);
    return authUser;
  }, [setUser, setRole]);

  const updateProfile = useCallback(async (userId, payload) => {
    const response = await fetch(`/api/users/${userId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update profile.");
    }

    const updatedUser = await response.json();
    setUser(updatedUser);
    return updatedUser;
  }, [setUser]);

  const isAuthenticated = !!user && !!role;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      role,
      login,
      logout,
      register,
      updateProfile,
      vendorProfile: currentVendorProfile,
      customerProfile: currentCustomerProfile
    }),
    [user, isAuthenticated, role, login, logout, register, updateProfile, currentVendorProfile, currentCustomerProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
