import { useState, useEffect } from "react";
import FileIcon from "./FileIcon";
import api from "../api/axios";

interface FileThumbnailProps {
    fileId: string;
    fileName: string;
    mimeType?: string;
    size?: "sm" | "md" | "lg";
}

const isImageFile = (fileName: string, mimeType?: string): boolean => {
    if (mimeType?.startsWith("image/")) return true;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext);
};

const isVideoFile = (fileName: string, mimeType?: string): boolean => {
    if (mimeType?.startsWith("video/")) return true;
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    return ["mp4", "mov", "avi", "mkv", "webm"].includes(ext);
};

export default function FileThumbnail({ fileId, fileName, mimeType, size = "md" }: FileThumbnailProps) {
    const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const sizeClasses = {
        sm: "w-10 h-10",
        md: "w-14 h-14",
        lg: "w-20 h-20"
    };

    useEffect(() => {
        if (isImageFile(fileName, mimeType) || isVideoFile(fileName, mimeType)) {
            loadThumbnail();
        } else {
            setLoading(false);
        }
    }, [fileId, fileName, mimeType]);

    const loadThumbnail = async () => {
        try {
            // Use correct endpoint and response field
            const res = await api.get(`/files/preview/${fileId}`);
            setThumbnailUrl(res.data.previewUrl);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    // Show FileIcon for non-image files or on error
    if (!isImageFile(fileName, mimeType) && !isVideoFile(fileName, mimeType)) {
        return <FileIcon fileName={fileName} size={size} />;
    }

    if (loading) {
        return (
            <div className={`${sizeClasses[size]} rounded-xl bg-[var(--bg-hover)] animate-pulse flex items-center justify-center`}>
                <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    if (error || !thumbnailUrl) {
        return <FileIcon fileName={fileName} size={size} />;
    }

    // For images, show actual thumbnail
    if (isImageFile(fileName, mimeType)) {
        return (
            <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-md bg-[var(--bg-hover)]`}>
                <img
                    src={thumbnailUrl}
                    alt={fileName}
                    className="w-full h-full object-cover"
                    onError={() => setError(true)}
                />
            </div>
        );
    }

    // For videos, show thumbnail with play icon overlay
    return (
        <div className={`${sizeClasses[size]} rounded-xl overflow-hidden shadow-md bg-[var(--bg-hover)] relative`}>
            <video
                src={thumbnailUrl}
                className="w-full h-full object-cover"
                onError={() => setError(true)}
                muted
                preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <svg className="w-6 h-6 text-white drop-shadow" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                </svg>
            </div>
        </div>
    );
}
