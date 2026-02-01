import type { FileItem } from "../types/drive";

export default function FileCard({ file }: { file: FileItem }) {
  return (
    <div className="border rounded p-3 hover:bg-gray-50 cursor-pointer">
      <p className="truncate">📄 {file.fileName}</p>
      <p className="text-xs text-gray-400 mt-1">Right-click for options</p>
    </div>
  );
}
