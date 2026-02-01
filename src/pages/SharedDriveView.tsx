import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import ContextMenu from "../components/ContextMenu";
import type { ContextMenuItem } from "../components/ContextMenu";
import StickyNotePanel from "../components/StickyNotePanel";
import { FolderIcon } from "../components/FileIcon";
import FileThumbnail from "../components/FileThumbnail";
import {
    getSharedDriveApi,
    getSharedDriveContentsApi,
    addMemberApi,
    removeMemberApi,
    getChatMessagesApi,
    sendChatMessageApi,
    createFolderInDriveApi,
    getNotesApi
} from "../api/shared";
import api from "../api/axios";

interface SharedDrive {
    _id: string;
    name: string;
    members: { email: string; role: string; userId?: string }[];
}

interface FileItem {
    _id: string;
    fileName: string;
    size?: number;
    s3Key?: string;
    mimeType?: string;
}

interface FolderItem {
    _id: string;
    name: string;
}

interface ChatMessage {
    _id: string;
    userEmail: string;
    message: string;
    createdAt: string;
}

interface StickyNote {
    _id: string;
    content: string;
    color: string;
    createdAt: string;
    creatorEmail?: string;
}

interface ContextMenuState {
    x: number;
    y: number;
    type: "empty" | "file" | "folder";
    target?: FileItem | FolderItem;
}

const formatSize = (bytes?: number): string => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function SharedDriveView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [drive, setDrive] = useState<SharedDrive | null>(null);
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [path, setPath] = useState("/");
    const [loading, setLoading] = useState(true);

    // Context menu
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    // Chat
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [sendingMessage, setSendingMessage] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Members
    const [showMembers, setShowMembers] = useState(false);
    const [newMemberEmail, setNewMemberEmail] = useState("");
    const [addingMember, setAddingMember] = useState(false);

    // Create folder
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [creatingFolder, setCreatingFolder] = useState(false);

    // File upload with progress
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Sticky notes
    const [notesItem, setNotesItem] = useState<{ type: "file" | "folder"; id: string } | null>(null);
    const [fileNotes, setFileNotes] = useState<Record<string, StickyNote[]>>({});

    // Preview
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewType] = useState<string>("");

    const loadDrive = async () => {
        if (!id) return;
        try {
            const res = await getSharedDriveApi(id);
            setDrive(res.data.sharedDrive);
        } catch (err) {
            console.error(err);
            navigate("/shared-drives");
        }
    };

    const loadContents = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await getSharedDriveContentsApi(id, path);
            setFolders(res.data.folders || []);
            setFiles(res.data.files || []);
            loadAllNotes(res.data.files || [], res.data.folders || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAllNotes = async (fileList: FileItem[], folderList: FolderItem[]) => {
        const notes: Record<string, StickyNote[]> = {};
        try {
            for (const file of fileList) {
                const res = await getNotesApi("file", file._id);
                if (res.data.notes?.length > 0) {
                    notes[`file-${file._id}`] = res.data.notes;
                }
            }
            for (const folder of folderList) {
                const res = await getNotesApi("folder", folder._id);
                if (res.data.notes?.length > 0) {
                    notes[`folder-${folder._id}`] = res.data.notes;
                }
            }
            setFileNotes(notes);
        } catch (err) {
            console.error("Failed to load notes", err);
        }
    };

    const loadChat = async () => {
        if (!id) return;
        try {
            const res = await getChatMessagesApi(id);
            setMessages(res.data.messages || []);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { loadDrive(); }, [id]);
    useEffect(() => { loadContents(); }, [id, path]);
    useEffect(() => { if (showChat) loadChat(); }, [showChat]);

    const handleContextMenu = (e: React.MouseEvent, type: "empty" | "file" | "folder", target?: FileItem | FolderItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, target });
    };

    const closeContextMenu = () => setContextMenu(null);

    // const getMimeType = (fileName: string, providedMimeType?: string): string => {
    //     if (providedMimeType) return providedMimeType;
    //     const ext = fileName.split('.').pop()?.toLowerCase() || '';
    //     const mimeTypes: Record<string, string> = {
    //         'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
    //         'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
    //         'pdf': 'application/pdf',
    //         'mp3': 'audio/mpeg', 'wav': 'audio/wav',
    //         'txt': 'text/plain', 'html': 'text/html', 'css': 'text/css', 'js': 'text/javascript'
    //     };
    //     return mimeTypes[ext] || '';
    // };

    const handlePreview = async (file: FileItem) => {
        try {
            const res = await api.get(`/files/preview/${file._id}`);
            // Open preview URL in new tab
            if (res.data.previewUrl) {
                window.open(res.data.previewUrl, "_blank");
            } else {
                console.error("No previewUrl in response");
                alert("Preview URL not found");
            }
        } catch (err: any) {
            console.error("Preview error:", err.response?.data || err);
            alert("Failed to preview file: " + (err.response?.data?.message || err.message));
        }
    };

    const handleDownload = async (file: FileItem) => {
        try {
            // Backend route is /files/download/:id (not /files/:id/download)
            const res = await api.get(`/files/download/${file._id}`);
            const link = document.createElement("a");
            link.href = res.data.downloadUrl;
            link.download = file.fileName;
            link.click();
        } catch (err) {
            console.error("Download error:", err);
            alert("Failed to download file");
        }
    };

    const getContextMenuItems = (): ContextMenuItem[] => {
        if (!contextMenu) return [];
        if (contextMenu.type === "empty") {
            return [{ label: "New Folder", icon: "📁", onClick: () => setShowCreateFolder(true) }];
        }
        if (contextMenu.type === "folder" && contextMenu.target) {
            const folder = contextMenu.target as FolderItem;
            return [
                { label: "Open", icon: "📂", onClick: () => setPath(path === "/" ? `/${folder.name}` : `${path}/${folder.name}`) },
                { label: "Notes", icon: "📝", onClick: () => setNotesItem({ type: "folder", id: folder._id }) },
            ];
        }
        if (contextMenu.type === "file" && contextMenu.target) {
            const file = contextMenu.target as FileItem;
            return [
                { label: "Open", icon: "👁️", onClick: () => handlePreview(file) },
                { label: "Download", icon: "⬇️", onClick: () => handleDownload(file) },
                { label: "Notes", icon: "📝", onClick: () => setNotesItem({ type: "file", id: file._id }) },
            ];
        }
        return [];
    };

    const goBack = () => {
        if (path === "/") {
            navigate("/shared-drives");
        } else {
            const parts = path.split("/").filter(Boolean);
            parts.pop();
            setPath(parts.length === 0 ? "/" : "/" + parts.join("/"));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !id) return;
        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("path", path);

            await api.post(`/shared-drives/${id}/upload`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
                onUploadProgress: (progressEvent) => {
                    const percent = progressEvent.total
                        ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        : 0;
                    setUploadProgress(percent);
                }
            });
            loadContents();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to upload file");
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim() || !id) return;
        setCreatingFolder(true);
        try {
            await createFolderInDriveApi(id, newFolderName.trim(), path);
            setNewFolderName("");
            setShowCreateFolder(false);
            loadContents();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to create folder");
        } finally {
            setCreatingFolder(false);
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail.trim() || !id) return;
        setAddingMember(true);
        try {
            await addMemberApi(id, newMemberEmail.trim(), "editor");
            setNewMemberEmail("");
            loadDrive();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to add member");
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (email: string) => {
        if (!id || !confirm(`Remove ${email} from this drive?`)) return;
        try {
            await removeMemberApi(id, email);
            loadDrive();
        } catch (err: any) {
            alert(err.response?.data?.message || "Failed to remove member");
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !id) return;
        setSendingMessage(true);
        try {
            await sendChatMessageApi(id, newMessage.trim());
            setNewMessage("");
            loadChat();
        } catch (err) {
            console.error(err);
        } finally {
            setSendingMessage(false);
        }
    };

    // Get the latest sticky note for display on card
    const getLatestNote = (type: "file" | "folder", itemId: string): StickyNote | null => {
        const notes = fileNotes[`${type}-${itemId}`];
        if (!notes || notes.length === 0) return null;
        return notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    };

    return (
        <Layout>
            <div className="flex gap-4 h-[calc(100vh-120px)]" onClick={closeContextMenu}>
                {/* Main Content */}
                <div className="flex-1 flex flex-col" onContextMenu={(e) => handleContextMenu(e, "empty")}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-4">
                            <button onClick={goBack} className="btn btn-secondary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                                Back
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                    </svg>
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold text-[var(--text-primary)]">{drive?.name || "Loading..."}</h1>
                                    <p className="text-sm text-[var(--text-muted)]">{path === "/" ? "Root" : path}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="btn btn-primary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                {uploading ? `${uploadProgress}%` : "Upload"}
                            </button>
                            <button onClick={() => setShowCreateFolder(true)} className="btn btn-primary">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                New Folder
                            </button>
                            <button onClick={() => setShowMembers(!showMembers)} className={`btn ${showMembers ? "btn-primary" : "btn-secondary"}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                {drive?.members.length || 0}
                            </button>
                            <button onClick={() => setShowChat(!showChat)} className={`btn ${showChat ? "btn-primary" : "btn-secondary"}`}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Chat
                            </button>
                        </div>
                    </div>

                    {/* Upload Progress Bar */}
                    {uploading && (
                        <div className="mb-4 animate-fadeIn">
                            <div className="card p-4">
                                <div className="flex items-center gap-4">
                                    <div className="spinner"></div>
                                    <div className="flex-1">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-[var(--text-primary)]">Uploading...</span>
                                            <span className="text-[var(--accent)]">{uploadProgress}%</span>
                                        </div>
                                        <div className="progress-bar">
                                            <div className="progress-bar-fill" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Files Grid */}
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-4">
                                <div className="spinner"></div>
                                <p className="text-[var(--text-muted)]">Loading files...</p>
                            </div>
                        </div>
                    ) : folders.length === 0 && files.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="card text-center p-12 max-w-md">
                                <div className="w-20 h-20 mx-auto mb-4">
                                    <FolderIcon size="lg" />
                                </div>
                                <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">This folder is empty</h3>
                                <p className="text-[var(--text-muted)] text-sm">Upload files or create folders to get started</p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-auto">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {folders.map((folder) => {
                                    const latestNote = getLatestNote("folder", folder._id);
                                    return (
                                        <div
                                            key={folder._id}
                                            onClick={() => setPath(path === "/" ? `/${folder.name}` : `${path}/${folder.name}`)}
                                            onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, "folder", folder); }}
                                            className="file-card group"
                                        >
                                            {/* Sticky Note Preview */}
                                            {latestNote && (
                                                <div className={`sticky-note-preview sticky-note-${latestNote.color}`}>
                                                    {latestNote.creatorEmail && (
                                                        <span className="text-[10px] opacity-70 block">{latestNote.creatorEmail.split("@")[0]}:</span>
                                                    )}
                                                    {latestNote.content.length > 30
                                                        ? latestNote.content.substring(0, 30) + "..."
                                                        : latestNote.content}
                                                </div>
                                            )}
                                            <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <FolderIcon />
                                            </div>
                                            <p className="text-sm font-medium text-[var(--text-primary)] text-center truncate">{folder.name}</p>
                                        </div>
                                    );
                                })}
                                {files.map((file) => {
                                    const latestNote = getLatestNote("file", file._id);
                                    return (
                                        <div
                                            key={file._id}
                                            onClick={() => handlePreview(file)}
                                            onContextMenu={(e) => { e.stopPropagation(); handleContextMenu(e, "file", file); }}
                                            className="file-card group"
                                        >
                                            {/* Sticky Note Preview */}
                                            {latestNote && (
                                                <div className={`sticky-note-preview sticky-note-${latestNote.color}`}>
                                                    {latestNote.creatorEmail && (
                                                        <span className="text-[10px] opacity-70 block">{latestNote.creatorEmail.split("@")[0]}:</span>
                                                    )}
                                                    {latestNote.content.length > 30
                                                        ? latestNote.content.substring(0, 30) + "..."
                                                        : latestNote.content}
                                                </div>
                                            )}
                                            <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                                                <FileThumbnail fileId={file._id} fileName={file.fileName} mimeType={file.mimeType} />
                                            </div>
                                            <p className="text-sm font-medium text-[var(--text-primary)] text-center truncate" title={file.fileName}>
                                                {file.fileName}
                                            </p>
                                            {file.size && (
                                                <p className="text-xs text-[var(--text-muted)] text-center mt-1">{formatSize(file.size)}</p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 flex flex-col card overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-indigo-500 to-purple-600">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Team Chat
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-3 space-y-3">
                            {messages.length === 0 ? (
                                <div className="text-center text-[var(--text-muted)] py-8">
                                    <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="text-sm">No messages yet</p>
                                </div>
                            ) : (
                                messages.map((msg) => (
                                    <div key={msg._id} className="card p-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="avatar w-6 h-6 text-xs">
                                                {msg.userEmail.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-xs font-medium text-[var(--text-primary)]">{msg.userEmail.split("@")[0]}</span>
                                            <span className="text-xs text-[var(--text-muted)] ml-auto">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] pl-8">{msg.message}</p>
                                    </div>
                                ))
                            )}
                            <div ref={chatEndRef}></div>
                        </div>
                        <div className="p-3 border-t border-[var(--border)]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                                    placeholder="Type a message..."
                                    className="input flex-1 text-sm"
                                />
                                <button onClick={handleSendMessage} disabled={sendingMessage || !newMessage.trim()} className="btn btn-primary px-4">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Members Sidebar */}
                {showMembers && (
                    <div className="w-72 card overflow-hidden animate-fadeIn">
                        <div className="p-4 border-b border-[var(--border)] bg-gradient-to-r from-emerald-500 to-teal-600">
                            <h3 className="font-semibold text-white flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Members ({drive?.members.length || 0})
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-3 space-y-2">
                            {drive?.members.map((member) => (
                                <div key={member.email} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-hover)] hover:bg-[var(--border)] transition-colors">
                                    <div className="avatar">
                                        {member.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.email}</p>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${member.role === "admin" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
                                            member.role === "editor" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" :
                                                "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                            }`}>
                                            {member.role}
                                        </span>
                                    </div>
                                    {member.role !== "admin" && (
                                        <button onClick={() => handleRemoveMember(member.email)} className="text-red-400 hover:text-red-600 p-1" title="Remove member">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="p-3 border-t border-[var(--border)]">
                            <input
                                type="email"
                                value={newMemberEmail}
                                onChange={(e) => setNewMemberEmail(e.target.value)}
                                placeholder="Add member email..."
                                className="input text-sm mb-2"
                            />
                            <button onClick={handleAddMember} disabled={addingMember || !newMemberEmail.trim()} className="btn btn-primary w-full text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                {addingMember ? "Adding..." : "Add Member"}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ContextMenu x={contextMenu.x} y={contextMenu.y} items={getContextMenuItems()} onClose={closeContextMenu} />
            )}

            {/* Create Folder Modal */}
            {showCreateFolder && (
                <div className="modal-overlay" onClick={() => setShowCreateFolder(false)}>
                    <div className="modal-content animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <FolderIcon />
                            <h2 className="font-semibold text-lg text-[var(--text-primary)]">Create New Folder</h2>
                        </div>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="input mb-4"
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreateFolder();
                                if (e.key === "Escape") setShowCreateFolder(false);
                            }}
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => { setShowCreateFolder(false); setNewFolderName(""); }} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleCreateFolder} disabled={creatingFolder || !newFolderName.trim()} className="btn btn-primary">
                                {creatingFolder ? "Creating..." : "Create"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sticky Notes Panel */}
            {notesItem && (
                <StickyNotePanel resourceType={notesItem.type} resourceId={notesItem.id} onClose={() => { setNotesItem(null); loadContents(); }} />
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
        </Layout>
    );
}
