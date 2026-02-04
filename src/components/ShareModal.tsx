import { useState, useEffect } from "react";
import { shareResourceApi, getResourceSharesApi, updateSharePermissionApi, removeShareApi } from "../api/shared";

interface Props {
    resourceType: "file" | "folder";
    resourceId: string;
    resourceName: string;
    onClose: () => void;
    onShared?: () => void;
}

interface SharedUser {
    _id: string;
    sharedWith: string; // email
    permission: "view" | "download" | "edit";
    createdAt: string;
}

export default function ShareModal({ resourceType, resourceId, resourceName, onClose, onShared }: Props) {
    const [email, setEmail] = useState("");
    const [permission, setPermission] = useState("download");
    const [sharing, setSharing] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [error, setError] = useState("");

    // Manage Access State
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [loadingShares, setLoadingShares] = useState(false);
    const [activeTab, setActiveTab] = useState<"share" | "manage">("share");

    useEffect(() => {
        if (activeTab === "manage") {
            loadShares();
        }
    }, [activeTab, resourceId]);

    const loadShares = async () => {
        setLoadingShares(true);
        try {
            const res = await getResourceSharesApi(resourceId);
            setSharedUsers(res.data.shares || []);
        } catch (err) {
            console.error("Failed to load shares", err);
        } finally {
            setLoadingShares(false);
        }
    };

    const handleShare = async () => {
        if (!email.trim()) return;
        setSharing(true);
        setError("");
        try {
            const res = await shareResourceApi(resourceType, resourceId, email.trim(), permission);
            setShareLink(res.data.shareLink);
            setEmail("");
            onShared?.();
            // Reload shares if we are in manage tab (or if we switch to it)
            if (activeTab === "manage") loadShares();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to share");
        } finally {
            setSharing(false);
        }
    };

    const handleUpdatePermission = async (shareId: string, newPermission: string) => {
        try {
            await updateSharePermissionApi(shareId, newPermission);
            setSharedUsers(prev => prev.map(u =>
                u._id === shareId ? { ...u, permission: newPermission as any } : u
            ));
        } catch (err) {
            console.error("Failed to update permission", err);
            alert("Failed to update permission");
        }
    };

    const handleRemoveShare = async (shareId: string) => {
        if (!window.confirm("Revoke access for this user?")) return;
        try {
            await removeShareApi(shareId);
            setSharedUsers(prev => prev.filter(u => u._id !== shareId));
        } catch (err) {
            console.error("Failed to remove share", err);
            alert("Failed to revoke access");
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">Share "{resourceName}"</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)] mb-4">
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'share' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setActiveTab("share")}
                    >
                        Share
                    </button>
                    <button
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'manage' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        onClick={() => setActiveTab("manage")}
                    >
                        Manage Access
                    </button>
                </div>

                {activeTab === "share" ? (
                    <>
                        {/* Share via email */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Share with email</label>
                            <div className="flex gap-2">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter email address"
                                    className="input flex-1"
                                />
                            </div>
                        </div>

                        {/* Permission */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Permission</label>
                            <select
                                value={permission}
                                onChange={(e) => setPermission(e.target.value)}
                                className="input"
                            >
                                <option value="view">Can view</option>
                                <option value="download">Can download</option>
                                <option value="edit">Can edit</option>
                            </select>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm mb-3">{error}</div>
                        )}

                        <button
                            onClick={handleShare}
                            disabled={sharing || !email.trim()}
                            className="btn btn-primary w-full mb-4"
                        >
                            {sharing ? "Sharing..." : "Share"}
                        </button>

                        {/* Share link */}
                        {shareLink && (
                            <div className="bg-[var(--bg-hover)] rounded-lg p-3">
                                <label className="block text-sm font-medium mb-2 text-[var(--text-primary)]">Share Link</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={shareLink}
                                        readOnly
                                        className="input flex-1 text-sm"
                                    />
                                    <button onClick={copyLink} className="btn btn-secondary">
                                        📋 Copy
                                    </button>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] mt-2">Anyone with this link can access the {resourceType}</p>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="max-h-60 overflow-y-auto">
                        {loadingShares ? (
                            <div className="flex justify-center py-4">
                                <div className="spinner w-6 h-6"></div>
                            </div>
                        ) : sharedUsers.length === 0 ? (
                            <p className="text-center text-[var(--text-muted)] py-4">Not shared with anyone yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {sharedUsers.map(user => (
                                    <div key={user._id} className="flex items-center justify-between bg-[var(--bg-hover)] p-3 rounded-lg">
                                        <div className="overflow-hidden mr-3">
                                            <p className="text-sm font-medium text-[var(--text-primary)] truncate" title={user.sharedWith}>
                                                {user.sharedWith}
                                            </p>
                                            <p className="text-xs text-[var(--text-muted)]">{new Date(user.createdAt).toLocaleDateString()}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="input py-1 px-2 text-xs"
                                                value={user.permission}
                                                onChange={(e) => handleUpdatePermission(user._id, e.target.value)}
                                            >
                                                <option value="view">View</option>
                                                <option value="download">Download</option>
                                                <option value="edit">Edit</option>
                                            </select>
                                            <button
                                                onClick={() => handleRemoveShare(user._id)}
                                                className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded"
                                                title="Revoke Access"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="btn btn-secondary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
