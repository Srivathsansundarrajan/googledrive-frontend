import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import FileIcon, { FolderIcon } from "../components/FileIcon";
import api from "../api/axios";

interface TrashItem {
    _id: string;
    type: "file" | "folder";
    name: string;
    size?: number;
    deletedAt: string;
    daysRemaining: number;
}

export default function Trash() {
    const [items, setItems] = useState<TrashItem[]>([]);
    const [loading, setLoading] = useState(true);

    const loadTrash = async () => {
        try {
            setLoading(true);
            const res = await api.get("/trash");
            setItems(res.data.items || []);
        } catch (err) {
            console.error("Failed to load trash", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTrash();
    }, []);

    const handleRestore = async (type: string, id: string) => {
        try {
            await api.post(`/trash/restore/${type}/${id}`);
            setItems(prev => prev.filter(item => item._id !== id));
        } catch (err) {
            console.error("Restore failed", err);
            alert("Failed to restore item");
        }
    };

    const handleDelete = async (type: string, id: string) => {
        if (!confirm("This will permanently delete the item. Continue?")) return;
        try {
            await api.delete(`/trash/${type}/${id}`);
            setItems(prev => prev.filter(item => item._id !== id));
        } catch (err) {
            console.error("Delete failed", err);
            alert("Failed to delete item");
        }
    };

    const handleEmptyTrash = async () => {
        if (!confirm("This will permanently delete ALL items in trash. Continue?")) return;
        try {
            await api.delete("/trash/empty");
            setItems([]);
        } catch (err) {
            console.error("Empty trash failed", err);
            alert("Failed to empty trash");
        }
    };

    const formatSize = (bytes?: number): string => {
        if (!bytes) return "";
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const formatDate = (dateStr: string): string => {
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <Layout>
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Trash</h1>
                    {items.length > 0 && (
                        <button
                            onClick={handleEmptyTrash}
                            className="btn btn-danger flex items-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Empty Trash
                        </button>
                    )}
                </div>

                <p className="text-sm text-[var(--text-muted)] mb-6">
                    Items in trash are automatically deleted after 30 days.
                </p>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="spinner"></div>
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="card text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                            <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <p className="text-lg text-[var(--text-secondary)] mb-2">Trash is empty</p>
                        <p className="text-sm text-[var(--text-muted)]">Deleted files and folders will appear here</p>
                    </div>
                )}

                {!loading && items.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {items.map((item) => (
                            <div key={item._id} className="file-card group relative">
                                {/* Days remaining badge */}
                                <div className="absolute top-2 right-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.daysRemaining <= 7
                                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        }`}>
                                        {item.daysRemaining}d left
                                    </span>
                                </div>

                                <div className="flex justify-center mb-3 mt-2 opacity-50 group-hover:opacity-100 transition-opacity">
                                    {item.type === "folder" ? <FolderIcon /> : <FileIcon fileName={item.name} />}
                                </div>

                                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center" title={item.name}>
                                    {item.name}
                                </p>

                                {item.size && (
                                    <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                                        {formatSize(item.size)}
                                    </p>
                                )}

                                <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                                    Deleted {formatDate(item.deletedAt)}
                                </p>

                                {/* Actions */}
                                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleRestore(item.type, item._id)}
                                        className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-dark)] transition-colors"
                                    >
                                        Restore
                                    </button>
                                    <button
                                        onClick={() => handleDelete(item.type, item._id)}
                                        className="flex-1 text-xs py-1.5 px-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
