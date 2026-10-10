import { createContext, useEffect, useMemo, useCallback, useReducer } from "react";
import { uid } from "../utils/formatters.js";
import { useAuth } from "../hooks/useAuth.js";
import { ToastStack } from "../components/common/Toast.jsx";

import { apiFetch } from "../services/api";

export const NotificationContext = createContext(null);

const initialState = {
  notifications: [],
  toasts: [],
};

function notificationReducer(state, action) {
  switch (action.type) {
    case "SET_NOTIFICATIONS":
      return { ...state, notifications: action.payload };
    case "ADD_NOTIFICATION":
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case "MARK_ALL_READ":
      return {
        ...state,
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      };
    case "ADD_TOAST":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "DISMISS_TOAST":
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };
    default:
      return state;
  }
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      dispatch({ type: "SET_NOTIFICATIONS", payload: [] });
      return;
    }
    try {
      const res = await apiFetch(`/api/notifications?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        dispatch({ type: "SET_NOTIFICATIONS", payload: data });
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const addNotification = useCallback(
    async (text, type = "system") => {
      if (!user) return;
      try {
        const res = await apiFetch("/api/notifications", {
          method: "POST",
          body: JSON.stringify({ userId: user.id, text, type }),
        });
        if (res.ok) {
          const newNotif = await res.json();
          dispatch({ type: "ADD_NOTIFICATION", payload: newNotif });
        }
      } catch (err) {
        console.error("Failed to add notification:", err);
      }
    },
    [user]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch("/api/notifications/read-all", {
        method: "PUT",
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        dispatch({ type: "MARK_ALL_READ" });
      }
    } catch (err) {
      console.error("Failed to mark all read:", err);
    }
  }, [user]);

  const addToast = useCallback((text, variant = "success") => {
    const id = uid("toast");
    dispatch({ type: "ADD_TOAST", payload: { id, text, variant } });
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    dispatch({ type: "DISMISS_TOAST", payload: id });
  }, []);

  const notifySuccess = useCallback(
    (text, alsoAsNotification = false) => {
      addToast(text, "success");
      if (alsoAsNotification && user) addNotification(text, "order");
    },
    [addToast, addNotification, user]
  );

  const notifyError = useCallback(
    (text) => addToast(text, "error"),
    [addToast]
  );

  const value = useMemo(
    () => ({
      notifications: state.notifications,
      toasts: state.toasts,
      addNotification,
      markAllRead,
      addToast,
      dismissToast,
      notifySuccess,
      notifyError,
    }),
    [
      state.notifications,
      state.toasts,
      addNotification,
      markAllRead,
      addToast,
      dismissToast,
      notifySuccess,
      notifyError,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <ToastStack />
    </NotificationContext.Provider>
  );
}
