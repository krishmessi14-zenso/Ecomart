import { createContext, useMemo, useCallback, useEffect } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage.js";
import { authService } from "../services/authService.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage("em_auth_user", null);
  const [role, setRole] = useLocalStorage("em_role", null);

  const currentCustomerProfile = useMemo(() => {
    if (user && role === "customer") {
      return { id: user.id || user._id, name: user.name };
    }
    return null;
  }, [user, role]);

  const currentVendorProfile = useMemo(() => {
    if (user && role === "vendor") {
      return {
        id: user.id || user._id,
        name: user.name,
        storeName: user.storeName || "My Store",
        region: user.region || "",
      };
    }
    return null;
  }, [user, role]);

  const login = useCallback(async (email, password, selectedRole) => {
    const authUser = await authService.login(email, password, selectedRole);
    if (authUser && authUser.token) {
      localStorage.setItem("token", authUser.token);
    }
    setUser(authUser);
    setRole(authUser.role);
    return authUser;
  }, [setUser, setRole]);

  const logout = useCallback(() => {
    setUser(null);
    setRole(null);
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("em_auth_user");
      localStorage.removeItem("em_role");
      localStorage.removeItem("em_cart_state");
      authService.logout().catch(() => {});
    } catch {
      /* noop */
    }
  }, [setUser, setRole]);

  useEffect(() => {
    const handleUnauthorized = () => {
      if (user) {
        logout();
      }
    };
    window.addEventListener("ecomart_unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("ecomart_unauthorized", handleUnauthorized);
    };
  }, [user, logout]);

  const registerCustomer = useCallback(async (payload) => {
    const authUser = await authService.registerCustomer(payload);
    if (authUser && authUser.token) {
      localStorage.setItem("token", authUser.token);
    }
    setUser(authUser);
    setRole(authUser.role);
    return authUser;
  }, [setUser, setRole]);

  const registerVendor = useCallback(async (payload) => {
    const authUser = await authService.registerVendor(payload);
    if (authUser && authUser.token) {
      localStorage.setItem("token", authUser.token);
    }
    setUser(authUser);
    setRole(authUser.role);
    return authUser;
  }, [setUser, setRole]);

  const register = useCallback(async (payload) => {
    if (payload.role === "vendor") {
      return registerVendor(payload);
    }
    return registerCustomer(payload);
  }, [registerCustomer, registerVendor]);

  const sendOTP = useCallback(async (email, purpose) => {
    return authService.sendOTP(email, purpose);
  }, []);

  const verifyOTP = useCallback(async (email, otp, purpose) => {
    return authService.verifyOTP(email, otp, purpose);
  }, []);

  const resendOTP = useCallback(async (email, purpose) => {
    return authService.resendOTP(email, purpose);
  }, []);

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
      registerCustomer,
      registerVendor,
      sendOTP,
      verifyOTP,
      resendOTP,
      updateProfile,
      vendorProfile: currentVendorProfile,
      customerProfile: currentCustomerProfile
    }),
    [user, isAuthenticated, role, login, logout, register, registerCustomer, registerVendor, sendOTP, verifyOTP, resendOTP, updateProfile, currentVendorProfile, currentCustomerProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
