import api from "./axios";

// Shared Drives
export const listSharedDrivesApi = () =>
    api.get("/shared-drives");

export const createSharedDriveApi = (name: string, description?: string) =>
    api.post("/shared-drives", { name, description });

export const getSharedDriveApi = (id: string) =>
    api.get(`/shared-drives/${id}`);

export const getSharedDriveContentsApi = (id: string, path: string = "/") =>
    api.get(`/shared-drives/${id}/contents?path=${encodeURIComponent(path)}`);

export const addMemberApi = (driveId: string, email: string, role: string = "editor") =>
    api.post(`/shared-drives/${driveId}/members`, { email, role });

export const removeMemberApi = (driveId: string, memberEmail: string) =>
    api.delete(`/shared-drives/${driveId}/members/${encodeURIComponent(memberEmail)}`);

export const deleteSharedDriveApi = (id: string) =>
    api.delete(`/shared-drives/${id}`);

export const createFolderInDriveApi = (driveId: string, name: string, parentPath: string = "/") =>
    api.post(`/shared-drives/${driveId}/folders`, { name, parentPath });

export const moveToSharedDriveApi = (driveId: string, resourceType: string, resourceId: string, targetPath: string = "/") =>
    api.post(`/shared-drives/${driveId}/move`, { resourceType, resourceId, targetPath });

export const uploadToSharedDriveApi = (driveId: string, file: File, folderPath: string = "/") => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", folderPath);
    return api.post(`/shared-drives/${driveId}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
};

// Sharing
export const shareResourceApi = (resourceType: string, resourceId: string, email: string, permission: string = "download") =>
    api.post("/share", { resourceType, resourceId, email, permission });

export const getSharedWithMeApi = () =>
    api.get("/share/with-me");

export const accessByTokenApi = (token: string) =>
    api.get(`/share/access/${token}`);

export const getSharedFolderContentsApi = (token: string, path: string = "/") =>
    api.get(`/share/folder/${token}?path=${encodeURIComponent(path)}`);

export const removeShareApi = (id: string) =>
    api.delete(`/share/${id}`);

export const getResourceSharesApi = (resourceId: string) =>
    api.get(`/share/resource/${resourceId}`);

export const updateSharePermissionApi = (id: string, permission: string) =>
    api.put(`/share/${id}`, { permission });

// Chat
export const getChatMessagesApi = (driveId: string, limit: number = 50) =>
    api.get(`/chat/drive/${driveId}?limit=${limit}`);

export const sendChatMessageApi = (driveId: string, message: string) =>
    api.post(`/chat/drive/${driveId}`, { message });

export const deleteChatMessageApi = (messageId: string) =>
    api.delete(`/chat/${messageId}`);

// Sticky Notes
export const addNoteApi = (resourceType: string, resourceId: string, content: string, color: string = "yellow") =>
    api.post("/notes", { resourceType, resourceId, content, color });

export const getNotesApi = (resourceType: string, resourceId: string) =>
    api.get(`/notes/${resourceType}/${resourceId}`);

export const getBatchNotesApi = (items: { resourceType: string; resourceId: string }[]) =>
    api.post("/notes/batch", { items });

export const updateNoteApi = (id: string, content?: string, color?: string) =>
    api.put(`/notes/${id}`, { content, color });

export const deleteNoteApi = (id: string) =>
    api.delete(`/notes/${id}`);

// Access Tracking
export const logAccessApi = (resourceType: string, resourceId: string, resourceName: string) =>
    api.post("/access/log", { resourceType, resourceId, resourceName });

export const getRecentAccessApi = (limit: number = 20) =>
    api.get(`/access/recent?limit=${limit}`);

export const getFrequentAccessApi = (limit: number = 20) =>
    api.get(`/access/frequent?limit=${limit}`);

// Starred
export const toggleStarredApi = (type: "file" | "folder", id: string) =>
    api.put(`/starred/${type}/${id}`);

export const getStarredApi = () =>
    api.get("/starred");

