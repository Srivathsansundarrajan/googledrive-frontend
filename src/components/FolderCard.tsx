import type { FolderItem } from "../types/drive";

export default function FolderCard({
  folder,
  onOpen,
}: {
  folder: FolderItem;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="border rounded p-3 cursor-pointer hover:bg-gray-50"
    >
      <p className="truncate">📁 {folder.name}</p>
      <p className="text-xs text-gray-400 mt-1">Right-click for options</p>
    </div>
  );
}
