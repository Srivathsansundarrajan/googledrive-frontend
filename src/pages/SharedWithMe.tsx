import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ContextMenu from "../components/ContextMenu";
import type { ContextMenuItem } from "../components/ContextMenu";
import { getSharedWithMeApi } from "../api/shared";
import api from "../api/axios";
import FileThumbnail from "../components/FileThumbnail";
import { FolderIcon } from "../components/FileIcon";

interface ShareItem {
    _id: string;
    resourceType: string;
    resourceId: string;
    permission: string;
    sharedBy: string | {
        email: string;
        firstName?: string;
        lastName?: string;
    };
    createdAt: string;
    accessToken: string;
    resource: {
        _id: string;
        fileName?: string;
        name?: string;
        size?: number;
        mimeType?: string;
        s3Key?: string;
    };
}

interface ContextMenuState {
    x: number;
    y: number;
    item: ShareItem;
}

const formatSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function SharedWithMe() {
    const [items, setItems] = useState<ShareItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType, setPreviewType] = useState<string>("");

    const loadShared = async () => {
        try {
            setLoading(true);
            const res = await getSharedWithMeApi();
            setItems(res.data.items || []);
        } catch (err) {
            console.error("Failed to load shared items", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadShared();
    }, []);

    const handleContextMenu = (e: React.MouseEvent, item: ShareItem) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({ x: e.clientX, y: e.clientY, item });
    };

    const closeContextMenu = () => setContextMenu(null);

    const handlePreview = async (item: ShareItem) => {
        if (item.resourceType !== "file") return;
        try {
            // Use access token for shared file preview
            const res = await api.get(`/share/access/${item.accessToken}`);
            if (res.data.previewUrl) {
                setPreviewUrl(res.data.previewUrl);
                setPreviewType(item.resource.mimeType || "");
            } else {
                // Fallback to direct preview
                const previewRes = await api.get(`/files/${item.resourceId}/preview`);
                setPreviewUrl(previewRes.data.url);
                setPreviewType(item.resource.mimeType || "");
            }
        } catch (err) {
            console.error("Preview error:", err);
            alert("Unable to preview this file. You may not have permission.");
        }
    };

    const handleDownload = async (item: ShareItem) => {
        if (item.resourceType !== "file") return;
        if (item.permission !== "download" && item.permission !== "edit") {
            alert("You don't have permission to download this file.");
            return;
        }
        try {
            const res = await api.get(`/share/access/${item.accessToken}`);
            if (res.data.previewUrl) {
                const link = document.createElement("a");
                link.href = res.data.previewUrl;
                link.download = item.resource.fileName || "download";
                link.click();
            }
        } catch (err) {
            console.error("Download error:", err);
            alert("Failed to download file");
        }
    };

    const handleOpen = (item: ShareItem) => {
        if (item.resourceType === "file") {
            handlePreview(item);
        } else {
            // Navigate to shared folder view
            window.location.href = `/shared/${item.accessToken}`;
        }
    };

    const getContextMenuItems = (): ContextMenuItem[] => {
        if (!contextMenu) return [];
        const item = contextMenu.item;

        const menuItems: ContextMenuItem[] = [
            { label: "Open", icon: "👁️", onClick: () => handleOpen(item) },
        ];

        // Only show download if permission allows
        if (item.permission === "download" || item.permission === "edit") {
            if (item.resourceType === "file") {
                menuItems.push({ label: "Download", icon: "⬇️", onClick: () => handleDownload(item) });
            }
        }

        // Add Remove option
        menuItems.push({
            label: "Remove",
            icon: "🗑️",
            onClick: async () => {
                if (window.confirm("Remove this shared item?")) {
                    try {
                        const { removeShareApi } = await import("../api/shared");
                        await removeShareApi(item._id);
                        setItems(prev => prev.filter(i => i._id !== item._id));
                    } catch (err) {
                        console.error("Failed to remove share", err);
                        alert("Failed to remove shared item");
                    }
                }
            }
        });

        menuItems.push({
            label: "View Details",
            icon: "ℹ️",
            onClick: () => alert(`Shared by: ${item.sharedBy}\nPermission: ${item.permission}\nShared on: ${new Date(item.createdAt).toLocaleString()}`)
        });

        return menuItems;
    };

    const getPermissionBadge = (permission: string) => {
        const colors = {
            view: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
            download: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
            edit: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
        };
        return colors[permission as keyof typeof colors] || colors.view;
    };

    return (
        <Layout>
            <div onClick={closeContextMenu}>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Shared with me</h1>

                {loading && (
                    <div className="flex items-center justify-center py-20">
                        <div className="spinner"></div>
                    </div>
                )}

                {!loading && items.length === 0 && (
                    <div className="card text-center py-16">
                        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[var(--bg-hover)] flex items-center justify-center">
                            <svg className="w-10 h-10 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <p className="text-lg text-[var(--text-secondary)] mb-2">No files shared with you yet</p>
                        <p className="text-sm text-[var(--text-muted)]">Files and folders that people share with you will appear here</p>
                    </div>
                )}

                {!loading && items.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {items.map((item) => (
                            <div
                                key={item._id}
                                className="file-card group cursor-pointer"
                                onClick={() => handleOpen(item)}
                                onContextMenu={(e) => handleContextMenu(e, item)}
                            >
                                {/* Permission badge - Repositioned to avoid overlap */}
                                <div className="absolute top-1 right-1 z-10">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm ${getPermissionBadge(item.permission)}`}>
                                        {item.permission}
                                    </span>
                                </div>

                                <div className="flex justify-center mb-3 mt-6 group-hover:scale-110 transition-transform">
                                    {item.resourceType === "folder" ? (
                                        <FolderIcon />
                                    ) : (
                                        <FileThumbnail
                                            fileId={item.resourceId}
                                            fileName={item.resource.fileName || ""}
                                            mimeType={item.resource.mimeType}
                                        />
                                    )}
                                </div>


                                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center" title={item.resource.fileName || item.resource.name}>
                                    {item.resource.fileName || item.resource.name}
                                </p>

                                {item.resource.size && (
                                    <p className="text-xs text-[var(--text-muted)] text-center mt-1">
                                        {formatSize(item.resource.size)}
                                    </p>
                                )}

                                <div className="mt-2 text-xs text-[var(--text-muted)] text-center truncate" title={`Shared by ${typeof item.sharedBy === 'string' ? item.sharedBy : item.sharedBy.email}`}>
                                    from {typeof item.sharedBy === 'string'
                                        ? item.sharedBy
                                        : (item.sharedBy.firstName ? `${item.sharedBy.firstName} ${item.sharedBy.lastName || ''}` : item.sharedBy.email.split("@")[0])
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Context Menu */}
                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={getContextMenuItems()}
                        onClose={closeContextMenu}
                    />
                )}

                {/* Preview Modal */}
                {previewUrl && (
                    <div className="modal-overlay" onClick={() => setPreviewUrl(null)}>
                        <div className="card max-w-4xl max-h-[90vh] overflow-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
                                <h3 className="font-semibold text-[var(--text-primary)]">File Preview</h3>
                                <button onClick={() => setPreviewUrl(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-2xl leading-none">&times;</button>
                            </div>
                            <div className="p-4">
                                {previewType.startsWith("image/") ? (
                                    <img src={previewUrl} alt="Preview" className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
                                ) : previewType.startsWith("video/") ? (
                                    <video src={previewUrl} controls className="max-w-full max-h-[70vh] mx-auto rounded-lg" />
                                ) : previewType === "application/pdf" ? (
                                    <iframe src={previewUrl} className="w-full h-[70vh] rounded-lg" title="PDF Preview" />
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-[var(--text-muted)] mb-4">Preview not available for this file type</p>
                                        <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open in New Tab</a>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
