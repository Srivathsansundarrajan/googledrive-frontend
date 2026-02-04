import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { getStarredApi, toggleStarredApi } from "../api/shared";
import { FolderIcon } from "../components/FileIcon";
import FileThumbnail from "../components/FileThumbnail";
import type { FileItem, FolderItem } from "../types/drive";
import api from "../api/axios";

const formatSize = (bytes?: number): string => {
    if (!bytes) return "File";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function Starred() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        loadStarred();
    }, []);

    const loadStarred = async () => {
        setLoading(true);
        setError("");
        try {
            const res = await getStarredApi();
            setFiles(res.data.files || []);
            setFolders(res.data.folders || []);
        } catch {
            setError("Failed to load starred items");
        } finally {
            setLoading(false);
        }
    };

    const handleUnstar = async (type: "file" | "folder", id: string) => {
        try {
            await toggleStarredApi(type, id);
            loadStarred();
        } catch (err) {
            console.error("Failed to unstar:", err);
        }
    };

    const handleDownloadFolder = (folder: FolderItem) => {
        try {
            const downloadUrl = `${api.defaults.baseURL}/folders/${folder._id}/download`;
            window.open(downloadUrl, "_blank");
        } catch (err) {
            console.error("Download folder error:", err);
        }
    };

    const handleDownloadFile = async (file: FileItem) => {
        try {
            const res = await api.get(`/files/download/${file._id}`);
            const link = document.createElement("a");
            link.href = res.data.downloadUrl;
            link.download = file.fileName;
            link.click();
        } catch (err) {
            console.error("Download error:", err);
        }
    };

    const handleOpenFolder = (folder: FolderItem) => {
        // Navigate to dashboard with path
        // We need to know parent path. FolderItem usually has it.
        const fullPath = folder.parentPath === "/" ? `/${folder.name}` : `${folder.parentPath}/${folder.name}`;
        navigate(`/dashboard?path=${encodeURIComponent(fullPath)}`);
    };

    const isEmpty = files.length === 0 && folders.length === 0;

    return (
        <Layout>
            <div>
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Starred</h1>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                ) : error ? (
                    <div className="card text-center py-16">
                        <p className="text-red-500">{error}</p>
                        <button onClick={loadStarred} className="btn btn-primary mt-4">
                            Retry
                        </button>
                    </div>
                ) : isEmpty ? (
                    <div className="card text-center py-16">
                        <div className="text-6xl mb-4">⭐</div>
                        <p className="text-lg text-[var(--text-secondary)] mb-2">No starred items</p>
                        <p className="text-sm text-[var(--text-muted)]">Star your important files and folders for quick access</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Starred Folders */}
                        {folders.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Folders</h2>
                                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {folders.map((folder) => (
                                        <div
                                            key={folder._id}
                                            className="file-card relative group cursor-pointer"
                                            onClick={() => handleOpenFolder(folder)}
                                        >
                                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadFolder(folder); }}
                                                    className="p-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm"
                                                    title="Download"
                                                >
                                                    ⬇️
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnstar("folder", folder._id); }}
                                                    className="p-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-yellow-500 hover:text-yellow-600 shadow-sm"
                                                    title="Unstar"
                                                >
                                                    ⭐
                                                </button>
                                            </div>
                                            <div className="flex flex-col items-center text-center">
                                                <div className="mb-2">
                                                    <FolderIcon size="lg" />
                                                </div>
                                                <span className="font-medium text-sm truncate w-full text-[var(--text-primary)]">
                                                    {folder.name}
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)]">
                                                    {folder.parentPath}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Starred Files */}
                        {files.length > 0 && (
                            <div>
                                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Files</h2>
                                <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                    {files.map((file) => (
                                        <div
                                            key={file._id}
                                            className="file-card relative group"
                                        >
                                            <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleDownloadFile(file); }}
                                                    className="p-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] shadow-sm"
                                                    title="Download"
                                                >
                                                    ⬇️
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleUnstar("file", file._id); }}
                                                    className="p-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-hover)] text-yellow-500 hover:text-yellow-600 shadow-sm"
                                                    title="Unstar"
                                                >
                                                    ⭐
                                                </button>
                                            </div>
                                            <div className="flex flex-col items-center text-center">
                                                <div className="mb-2">
                                                    <FileThumbnail
                                                        fileId={file._id}
                                                        fileName={file.fileName}
                                                        mimeType={file.mimeType}
                                                        size="lg"
                                                    />

                                                </div>
                                                <span className="font-medium text-sm truncate w-full text-[var(--text-primary)]">
                                                    {file.fileName}
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)]">
                                                    {formatSize(file.size)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </Layout >
    );
}
