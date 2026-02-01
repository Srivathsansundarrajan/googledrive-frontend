import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import api from "../api/axios";

interface SidebarProps {
    userEmail: string;
}

interface StorageInfo {
    used: number;
    limit: number;
    usedFormatted: string;
    limitFormatted: string;
}

export default function Sidebar({ userEmail }: SidebarProps) {
    const navigate = useNavigate();
    const [storage, setStorage] = useState<StorageInfo | null>(null);

    useEffect(() => {
        const fetchStorage = async () => {
            try {
                const res = await api.get("/storage");
                setStorage(res.data);
            } catch (err) {
                console.error("Failed to fetch storage", err);
            }
        };
        fetchStorage();
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        navigate("/");
    };

    const navItems = [
        { path: "/dashboard", icon: "📁", label: "My Drive" },
        { path: "/shared-with-me", icon: "👥", label: "Shared with me" },
        { path: "/shared-drives", icon: "🏢", label: "Shared Drives" },
        { path: "/recent", icon: "🕐", label: "Recent" },
        { path: "/starred", icon: "⭐", label: "Starred" },
        { path: "/trash", icon: "🗑️", label: "Trash" },
    ];

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase();
    };

    const getStoragePercent = () => {
        if (!storage) return 0;
        return Math.min(100, (storage.used / storage.limit) * 100);
    };

    return (
        <div className="sidebar">
            {/* Logo */}
            <div className="p-4 border-b border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-xl">☁️</span>
                    </div>
                    <span className="font-bold text-xl text-[var(--text-primary)]">CloudDrive</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-item ${isActive ? "active" : ""}`
                        }
                    >
                        <span className="text-xl">{item.icon}</span>
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Storage Indicator */}
            <div className="p-4 border-t border-[var(--border)]">
                <div className="card p-3 bg-[var(--bg-secondary)]">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-[var(--text-secondary)]">Storage</span>
                        <span className="font-medium text-[var(--text-primary)]">
                            {storage ? `${storage.usedFormatted} of ${storage.limitFormatted}` : "Loading..."}
                        </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-300 ${getStoragePercent() > 90
                                ? "bg-red-500"
                                : getStoragePercent() > 70
                                    ? "bg-yellow-500"
                                    : "bg-gradient-to-r from-blue-500 to-purple-500"
                                }`}
                            style={{ width: `${Math.max(getStoragePercent(), storage && storage.used > 0 ? 2 : 0)}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* User Section */}
            <div className="p-4 border-t border-[var(--border)]">
                <div className="flex items-center gap-3">
                    <div className="avatar">{getInitials(userEmail)}</div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[var(--text-primary)]">{userEmail}</p>
                        <button
                            onClick={handleLogout}
                            className="text-xs text-[var(--text-secondary)] hover:text-[var(--danger)]"
                        >
                            Sign out
                        </button>
                    </div>
                    <NavLink
                        to="/profile"
                        className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg"
                    >
                        ⚙️
                    </NavLink>
                </div>
            </div>
        </div>
    );
}
