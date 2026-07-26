// @ts-nocheck
// Template ID: form-fileupload
"use client";

import {
  forwardRef,
  useState,
  useRef,
  useCallback,
  type DragEvent,
  type InputHTMLAttributes,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileItem {
  name: string;
  size: number;
  file: File;
}

export interface FileUploadProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "accept"> {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  onFilesSelected?: (files: FileItem[]) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      accept,
      multiple = false,
      maxSize,
      onFilesSelected,
      className,
      ...props
    },
    ref
  ) => {
    const [dragOver, setDragOver] = useState(false);
    const [files, setFiles] = useState<FileItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const processFiles = useCallback(
      (fileList: FileList) => {
        setError(null);
        const items: FileItem[] = [];
        for (let i = 0; i < fileList.length; i++) {
          const f = fileList[i];
          if (maxSize && f.size > maxSize) {
            setError(`"${f.name}" exceeds the max file size (${formatSize(maxSize)})`);
            continue;
          }
          items.push({ name: f.name, size: f.size, file: f });
        }
        if (items.length === 0) return;
        setFiles((prev) => (multiple ? [...prev, ...items] : items));
        onFilesSelected?.(multiple ? [...files, ...items] : items);
      },
      [maxSize, multiple, onFilesSelected, files]
    );

    const handleDrop = useCallback(
      (e: DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
      },
      [processFiles]
    );

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = () => setDragOver(false);

    const removeFile = (index: number) => {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    return (
      <div ref={ref} className={cn("space-y-3", className)}>
        <motion.div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          animate={
            dragOver
              ? {
                  borderColor: "#10a37f",
                  backgroundColor: "rgba(16,163,127,0.08)",
                  scale: 1.01,
                }
              : {
                  borderColor: "#424242",
                  backgroundColor: "rgba(0,0,0,0)",
                  scale: 1,
                }
          }
          transition={{ duration: 0.2 }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors",
            "hover:border-incogni-muted"
          )}
        >
          <motion.div
            animate={
              dragOver
                ? { y: [0, -6, 0], transition: { repeat: Infinity, duration: 1 } }
                : { y: 0 }
            }
          >
            <Upload
              size={36}
              className={dragOver ? "text-incogni-accent" : "text-incogni-muted"}
            />
          </motion.div>
          <p className="text-sm text-incogni-text">
            {dragOver
              ? "Drop files here"
              : "Drag & drop files or click to browse"}
          </p>
          {accept && (
            <p className="text-xs text-incogni-muted">Accepted: {accept}</p>
          )}
          {maxSize && (
            <p className="text-xs text-incogni-muted">
              Max size: {formatSize(maxSize)}
            </p>
          )}
        </motion.div>

        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            if (e.target.files?.length) processFiles(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          {...props}
        />

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1 text-xs text-red-400"
          >
            <AlertCircle size={12} />
            {error}
          </motion.p>
        )}

        <AnimatePresence>
          {files.length > 0 && (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-2"
            >
              {files.map((f, i) => (
                <motion.li
                  key={`${f.name}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2 rounded-lg border border-incogni-border bg-incogni-surface px-3 py-2 text-sm"
                >
                  <FileText size={16} className="shrink-0 text-incogni-accent" />
                  <span className="flex-1 truncate text-incogni-text">
                    {f.name}
                  </span>
                  <span className="shrink-0 text-xs text-incogni-muted">
                    {formatSize(f.size)}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="shrink-0 rounded p-0.5 text-incogni-muted transition-colors hover:bg-incogni-border hover:text-incogni-text"
                  >
                    <X size={14} />
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

FileUpload.displayName = "FileUpload";
