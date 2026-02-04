import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from "react";
import api from "../api/axios";
import soundService from "../services/soundService";
import socketService from "../services/socketService";


interface Notification {
    _id: string; // Changed from id to _id to match MongoDB
    type: "chat" | "note" | "share" | "info";
    title: string;
    message: string;
    link?: string;
    timestamp: string; // Date string from backend
    read: boolean;
}

interface NotificationContextType {
    notifications: Notification[];
    unreadCount: number;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearNotifications: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error("useNotifications must be used within NotificationProvider");
    }
    return context;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const previousCountRef = useRef(0);

    const fetchNotifications = async () => {
        try {
            const res = await api.get("/notifications");
            const newNotifications = res.data.notifications || [];

            // Play sound if there are new notifications
            if (newNotifications.length > previousCountRef.current && previousCountRef.current > 0) {
                soundService.playNotification();
            }

            previousCountRef.current = newNotifications.length;
            setNotifications(newNotifications);
        } catch (err) {
            console.error("Failed to fetch notifications", err);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // Connect socket
        socketService.connect();

        // Get user ID from token to register socket
        const token = localStorage.getItem("token");
        if (token) {
            try {
                // Decode token payload (base64url)
                const payload = JSON.parse(atob(token.split(".")[1]));
                const userId = payload.userId || payload.id || payload._id;
                if (userId) {
                    socketService.register(userId);
                }
            } catch (e) {
                console.error("Failed to decode token for socket registration", e);
            }
        }

        // Listen for new notifications
        socketService.on("new_notification", (newNotification: Notification) => {
            soundService.playNotification();
            setNotifications(prev => [newNotification, ...prev]);
        });

        return () => {
            socketService.off("new_notification");
            socketService.disconnect();
        };
    }, []);


    const markAsRead = async (id: string) => {
        try {
            await api.put(`/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n._id === id ? { ...n, read: true } : n)
            );
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllAsRead = async () => {
        try {
            await api.put("/notifications/read-all");
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error("Failed to mark all as read", err);
        }
    };

    const clearNotifications = async () => {
        try {
            await api.delete("/notifications");
            setNotifications([]);
        } catch (err) {
            console.error("Failed to clear notifications", err);
        }
    };

    const deleteNotification = async (id: string) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(prev => prev.filter(n => n._id !== id));
        } catch (err) {
            console.error("Failed to delete notification", err);
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            markAsRead,
            markAllAsRead,
            clearNotifications,
            deleteNotification,
            refreshNotifications: fetchNotifications
        }}>
            {children}
        </NotificationContext.Provider>
    );
}
