import { useEffect, useState, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";
import api from "../api/axios";

interface LayoutProps {
    children: ReactNode;
}

interface SearchResult {
    type: "file" | "folder";
    _id: string;
    name: string;
    path: string;
}

export default function Layout({ children }: LayoutProps) {
    const [userEmail, setUserEmail] = useState("");
    const { darkMode, toggleDarkMode } = useTheme();
    const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, deleteNotification } = useNotifications();
    const navigate = useNavigate();

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Swipe gesture navigation
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        // Decode JWT to get email
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split(".")[1]));
                setUserEmail(payload.email || "user@example.com");
            } catch {
                setUserEmail("user@example.com");
            }
        }
    }, []);

    // Debounced search
    useEffect(() => {
        const handler = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setSearching(true);
                try {
                    const res = await api.get(`/files/search?q=${encodeURIComponent(searchQuery)}`);
                    setSearchResults(res.data.results || []);
                    setShowResults(true);
                } catch (err) {
                    console.error("Search error:", err);
                    setSearchResults([]);
                }
                setSearching(false);
            } else {
                setSearchResults([]);
                setShowResults(false);
            }
        }, 300);

        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Swipe gesture navigation for mobile
    useEffect(() => {
        const minSwipeDistance = 100; // Minimum distance for swipe

        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            touchEndX.current = e.changedTouches[0].clientX;
            const distance = touchEndX.current - touchStartX.current;

            // Swipe right = go back
            if (distance > minSwipeDistance) {
                window.history.back();
            }
            // Swipe left = go forward
            else if (distance < -minSwipeDistance) {
                window.history.forward();
            }
        };

        const main = mainRef.current;
        if (main) {
            main.addEventListener("touchstart", handleTouchStart);
            main.addEventListener("touchend", handleTouchEnd);
        }

        return () => {
            if (main) {
                main.removeEventListener("touchstart", handleTouchStart);
                main.removeEventListener("touchend", handleTouchEnd);
            }
        };
    }, []);

    const handleResultClick = (result: SearchResult) => {
        setShowResults(false);
        setSearchQuery("");
        if (result.path) {
            // Navigate to dashboard with path
            navigate(`/dashboard?path=${encodeURIComponent(result.path)}`);
        } else {
            navigate("/dashboard");
        }
        window.location.reload();
    };

    const handleNotificationClick = async (notification: any) => {
        if (!notification.read) {
            await markAsRead(notification._id);
        }
        if (notification.link) {
            navigate(notification.link);
            setShowNotifications(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-[var(--bg-primary)]">
            <Sidebar userEmail={userEmail} />

            {/* Main Content */}
            <main ref={mainRef} className="flex-1 ml-64">
                {/* Top Bar */}
                <header className="sticky top-0 z-10 bg-[var(--bg-primary)]/80 backdrop-blur-sm border-b border-[var(--border)] px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="relative">
                            <div className="search-bar w-96">
                                <svg className="w-5 h-5 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                    placeholder="Search in Drive..."
                                    className="flex-1"
                                />
                                {searching && (
                                    <div className="animate-spin w-4 h-4 border-2 border-[var(--accent)] border-t-transparent rounded-full"></div>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {showResults && searchResults.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl max-h-80 overflow-auto z-50">
                                    {searchResults.map((result) => (
                                        <div
                                            key={`${result.type}-${result._id}`}
                                            onClick={() => handleResultClick(result)}
                                            className="flex items-center gap-3 p-3 hover:bg-[var(--bg-hover)] cursor-pointer border-b border-[var(--border)] last:border-b-0"
                                        >
                                            <span className="text-xl">
                                                {result.type === "folder" ? "📁" : "📄"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-[var(--text-primary)] truncate">{result.name}</p>
                                                <p className="text-xs text-[var(--text-muted)] truncate">{result.path || "/"}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {showResults && searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl p-4 z-50">
                                    <p className="text-[var(--text-muted)] text-center text-sm">No results found</p>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Dark Mode Toggle */}
                            <button
                                onClick={toggleDarkMode}
                                className="theme-toggle"
                                title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                            >
                                {darkMode ? (
                                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                )}
                            </button>

                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="p-2 hover:bg-[var(--bg-hover)] rounded-lg transition-colors relative"
                                >
                                    <svg className="w-5 h-5 text-[var(--text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                    </svg>
                                    {unreadCount > 0 && (
                                        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-primary)]"></span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                                        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl z-50 overflow-hidden">
                                            <div className="p-3 border-b border-[var(--border)] flex justify-between items-center bg-[var(--bg-secondary)]">
                                                <h3 className="font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
                                                <div className="flex gap-2">
                                                    {unreadCount > 0 && (
                                                        <button onClick={markAllAsRead} className="text-xs text-[var(--accent)] hover:underline">
                                                            Mark all read
                                                        </button>
                                                    )}
                                                    {notifications.length > 0 && (
                                                        <button onClick={clearNotifications} className="text-xs text-red-500 hover:underline">
                                                            Clear all
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="max-h-96 overflow-y-auto">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center text-[var(--text-muted)] text-sm">
                                                        No new notifications
                                                    </div>
                                                ) : (
                                                    notifications.map((notification: any) => (
                                                        <div
                                                            key={notification._id}
                                                            onClick={() => handleNotificationClick(notification)}
                                                            className={`p-3 border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)] cursor-pointer transition-colors ${!notification.read ? 'bg-[var(--accent-light)]/10' : ''}`}
                                                        >
                                                            <div className="flex gap-3">
                                                                <div className="text-xl pt-0.5">
                                                                    {notification.type === 'chat' ? '💬' : notification.type === 'note' ? '📝' : 'ℹ️'}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm ${!notification.read ? 'font-semibold' : 'font-medium'} text-[var(--text-primary)] truncate`}>
                                                                        {notification.title}
                                                                    </p>
                                                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-0.5">
                                                                        {notification.message}
                                                                    </p>
                                                                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                                                                        {new Date(notification.createdAt).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                                <div className="flex flex-col items-center gap-1">
                                                                    {!notification.read && (
                                                                        <div className="w-2 h-2 bg-[var(--accent)] rounded-full"></div>
                                                                    )}
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); deleteNotification(notification._id); }}
                                                                        className="text-[var(--text-muted)] hover:text-red-500 text-xs"
                                                                        title="Delete"
                                                                    >
                                                                        ✕
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Click outside to close search */}
                {showResults && (
                    <div className="fixed inset-0 z-0" onClick={() => setShowResults(false)}></div>
                )}

                {/* Page Content */}
                <div className="p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
