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
    breakdown?: {
        images: { size: number; count: number };
        videos: { size: number; count: number };
        audio: { size: number; count: number };
        documents: { size: number; count: number };
        others: { size: number; count: number };
    };
}

export default function Sidebar({ userEmail }: SidebarProps) {
    const navigate = useNavigate();
    const [storage, setStorage] = useState<StorageInfo | null>(null);
    const [showStorageDetail, setShowStorageDetail] = useState(false);

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
        { path: "/starred", icon: "⭐", label: "Favourites" },
        { path: "/trash", icon: "🗑️", label: "Trash" },
    ];

    const getInitials = (email: string) => {
        return email.charAt(0).toUpperCase();
    };

    const getStoragePercent = () => {
        if (!storage) return 0;
        return Math.min(100, (storage.used / storage.limit) * 100);
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
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
                <div
                    className="card p-3 bg-[var(--bg-secondary)] cursor-pointer hover:bg-[var(--bg-hover)] transition-colors"
                    onClick={() => setShowStorageDetail(true)}
                >
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
                    <p className="text-xs text-[var(--text-muted)] mt-2 text-center">Click for details</p>
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

            {/* Storage Detail Modal */}
            {showStorageDetail && storage && (
                <div className="modal-overlay" onClick={() => setShowStorageDetail(false)}>
                    <div className="modal-content max-w-sm" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-lg text-[var(--text-primary)]">Storage Breakdown</h3>
                            <button onClick={() => setShowStorageDetail(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div className="text-center py-4 bg-[var(--bg-secondary)] rounded-lg">
                                <p className="text-3xl font-bold text-[var(--text-primary)]">{storage.usedFormatted}</p>
                                <p className="text-sm text-[var(--text-secondary)]">used of {storage.limitFormatted}</p>
                            </div>

                            <div className="space-y-3">
                                {storage.breakdown && Object.entries(storage.breakdown).map(([category, data]: [string, any]) => (
                                    <div key={category} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">
                                                {category === "images" && "🖼️"}
                                                {category === "videos" && "🎬"}
                                                {category === "audio" && "🎵"}
                                                {category === "documents" && "📄"}
                                                {category === "others" && "📦"}
                                            </span>
                                            <span className="capitalize text-[var(--text-primary)]">{category}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium text-[var(--text-primary)]">{formatBytes(data.size)}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
