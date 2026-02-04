import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Layout from "../components/Layout";
import { getSharedFolderContentsApi } from "../api/shared";
import FileThumbnail from "../components/FileThumbnail";
import { FolderIcon } from "../components/FileIcon";
import ContextMenu from "../components/ContextMenu";

interface FileItem {
    _id: string;
    fileName: string;
    mimeType: string;
    size: number;
}

interface FolderItem {
    _id: string;
    name: string;
}

interface ContextMenuState {
    x: number;
    y: number;
    type: "file" | "folder";
    target: FileItem | FolderItem;
}

export default function SharedFolder() {
    const { token } = useParams();
    const [searchParams, setSearchParams] = useSearchParams();
    const currentPath = searchParams.get("path") || "/";

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [folders, setFolders] = useState<FolderItem[]>([]);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [rootName, setRootName] = useState("");

    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    useEffect(() => {
        if (token) {
            loadContents();
        }
    }, [token, currentPath]);

    const loadContents = async () => {
        if (!token) return;
        try {
            setLoading(true);
            setError("");
            const res = await getSharedFolderContentsApi(token, currentPath);
            setFolders(res.data.folders);
            setFiles(res.data.files);
            setRootName(res.data.rootFolderName);

        } catch (err: any) {
            setError(err.response?.data?.message || "Failed to load folder");
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (folderName: string) => {
        const newPath = currentPath === "/" ? `/${folderName}` : `${currentPath}/${folderName}`;
        setSearchParams({ path: newPath });
    };

    const handleUp = () => {
        if (currentPath === "/") return;
        const parts = currentPath.split("/").filter(Boolean);
        parts.pop();
        const newPath = parts.length === 0 ? "/" : `/${parts.join("/")}`;
        setSearchParams({ path: newPath });
    };



    // NOTE: For a real implementation, we'd need an endpoint like /share/folder/:token/download/:fileId
    // which verifies the token allows access to the folder, and the file is inside it.

    const handleContextMenu = (e: React.MouseEvent, type: "file" | "folder", target: FileItem | FolderItem) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, type, target });
    };

    const closeContextMenu = () => setContextMenu(null);

    return (
        <Layout>
            <div onClick={closeContextMenu} className="min-h-screen">
                <div className="flex items-center gap-4 mb-6">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                        Shared: {rootName} {currentPath !== "/" ? `(${currentPath})` : ""}
                    </h1>
                    {currentPath !== "/" && (
                        <button onClick={handleUp} className="btn btn-secondary text-sm">↑ Up</button>
                    )}
                </div>

                {error && <div className="text-red-500 p-4">{error}</div>}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin w-8 h-8 border-4 border-[var(--accent)] border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {folders.map(folder => (
                            <div
                                key={folder._id}
                                className="file-card group cursor-pointer"
                                onClick={() => handleNavigate(folder.name)}
                                onContextMenu={(e) => handleContextMenu(e, "folder", folder)}
                            >
                                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FolderIcon />
                                </div>
                                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center">{folder.name}</p>
                            </div>
                        ))}

                        {files.map(file => (
                            <div
                                key={file._id}
                                className="file-card group cursor-pointer"
                                onContextMenu={(e) => handleContextMenu(e, "file", file)}
                            >
                                <div className="flex justify-center mb-3 group-hover:scale-110 transition-transform">
                                    <FileThumbnail fileId={file._id} fileName={file.fileName} mimeType={file.mimeType} />
                                </div>
                                <p className="font-medium truncate text-sm text-[var(--text-primary)] text-center">{file.fileName}</p>
                            </div>
                        ))}
                    </div>
                )}

                {contextMenu && (
                    <ContextMenu
                        x={contextMenu.x}
                        y={contextMenu.y}
                        items={[
                            {
                                label: "Open",
                                icon: "📂",
                                onClick: () => contextMenu.type === "folder"
                                    ? handleNavigate((contextMenu.target as FolderItem).name)
                                    : alert("Preview coming soon")
                            }
                        ]}
                        onClose={closeContextMenu}
                    />
                )}
            </div>
        </Layout>
    );
}
