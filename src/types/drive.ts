export interface FolderItem {
  _id: string;
  name: string;
  parentPath: string;
  createdAt: string;
}

export interface FileItem {
  _id: string;
  fileName: string;
  folderPath: string;
  size?: number;
  mimeType?: string;
  createdAt: string;
}
