import { useState } from "react";
import { shareResourceApi } from "../api/shared";

interface Props {
    resourceType: "file" | "folder";
    resourceId: string;
    resourceName: string;
    onClose: () => void;
    onShared?: () => void;
}

export default function ShareModal({ resourceType, resourceId, resourceName, onClose, onShared }: Props) {
    const [email, setEmail] = useState("");
    const [permission, setPermission] = useState("download");
    const [sharing, setSharing] = useState(false);
    const [shareLink, setShareLink] = useState("");
    const [error, setError] = useState("");

    const handleShare = async () => {
        if (!email.trim()) return;
        setSharing(true);
        setError("");
        try {
            const res = await shareResourceApi(resourceType, resourceId, email.trim(), permission);
            setShareLink(res.data.shareLink);
            setEmail("");
            onShared?.();
        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to share");
        } finally {
            setSharing(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(shareLink);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-lg text-[var(--text-primary)]">Share "{resourceName}"</h2>
                    <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xl">
                        ✕
                    </button>
                </div>

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

                <div className="mt-4 flex justify-end">
                    <button onClick={onClose} className="btn btn-secondary">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
