import api from "./axios";

export const listFilesApi = (path: string) =>
  api.get(`/files/list?path=${encodeURIComponent(path)}`);

export const uploadFileApi = (
  data: FormData,
  onProgress?: (percent: number) => void,
  signal?: AbortSignal
) => {
  return api.post("/files/upload", data, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    signal,
    onUploadProgress: (event) => {
      if (!event.total) return;
      const percent = Math.round(
        (event.loaded * 100) / event.total
      );
      onProgress?.(percent);
    },
  });
};

export const previewFileApi = (fileId: string) =>
  api.get(`/files/preview/${fileId}`);

export const downloadFileApi = (fileId: string) =>
  api.get(`/files/download/${fileId}`);

export const deleteFileApi = (fileId: string) =>
  api.delete(`/files/${fileId}`);

export const deleteFolderApi = (folderId: string) =>
  api.delete(`/folders/${folderId}`);

export const checkFolderExistsApi = (folderName: string, parentPath: string) =>
  api.get(`/folders/check-exists?name=${encodeURIComponent(folderName)}&parentPath=${encodeURIComponent(parentPath)}`);

export const createFolderApi = (name: string, parentPath: string) =>
  api.post("/folders/create", { name, parentPath });

export const moveFileApi = (fileId: string, targetPath: string) =>
  api.put(`/files/${fileId}/move`, { targetPath });

export const moveFolderApi = (folderId: string, targetPath: string) =>
  api.put(`/folders/${folderId}/move`, { targetPath });

