import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { filesRepository } from "@/db/repositories/files.repository";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatFileSize } from "@/lib/utils";
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Eye,
  FileImage,
  FileSpreadsheet,
  File,
} from "lucide-react";
import type { Student, StoredFile, StoredFileMetadata } from "@/types/database";

interface FilesTabProps {
  student: Student;
}

export function FilesTab({ student }: FilesTabProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: StoredFile; textContent?: string; objectUrl?: string } | null>(null);
  const [deletingFile, setDeletingFile] = useState<StoredFileMetadata | null>(null);

  const files = useLiveQuery(
    () => db.files.where("studentId").equals(student.id!).toArray(),
    [student.id]
  );

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await filesRepository.uploadFile({
        studentId: student.id!,
        classId: student.classId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        blob: file,
      });
    } catch (err) {
      alert("Failed to upload file: " + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileMeta: StoredFileMetadata) => {
    if (!fileMeta.id) return;
    const fullFile = await filesRepository.getFileWithBlob(fileMeta.id);
    if (fullFile) {
      filesRepository.downloadFile(fullFile);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFile?.id) return;
    await filesRepository.delete(deletingFile.id);
    setDeletingFile(null);
  };

  const handlePreview = async (fileMeta: StoredFileMetadata) => {
    if (!fileMeta.id) return;
    const fullFile = await filesRepository.getFileWithBlob(fileMeta.id);
    if (!fullFile) return;

    if (fullFile.mimeType.startsWith("image/")) {
      const url = URL.createObjectURL(fullFile.blob);
      setPreviewFile({ file: fullFile, objectUrl: url });
    } else if (
      fullFile.mimeType.startsWith("text/") ||
      fullFile.mimeType === "application/json"
    ) {
      const text = await fullFile.blob.text();
      setPreviewFile({ file: fullFile, textContent: text });
    } else {
      // Fallback: download if unsupported preview
      filesRepository.downloadFile(fullFile);
    }
  };

  const closePreview = () => {
    if (previewFile?.objectUrl) {
      URL.revokeObjectURL(previewFile.objectUrl);
    }
    setPreviewFile(null);
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-blue-500" />;
    if (mimeType.includes("sheet") || mimeType.includes("csv")) return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    if (mimeType.includes("pdf") || mimeType.startsWith("text/")) return <FileText className="w-5 h-5 text-indigo-500" />;
    return <File className="w-5 h-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header & Upload Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Student Documents & Portfolios
          </div>
          <div className="text-2xl font-bold tracking-tight mt-0.5">
            {files?.length ?? 0} Stored Documents
          </div>
        </div>

        <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow hover:bg-primary/90 transition-colors cursor-pointer self-start sm:self-auto">
          <Upload className="w-4 h-4" />
          <span>{isUploading ? "Uploading..." : "Upload Document"}</span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>

      {/* Files Grid */}
      {!files || files.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents uploaded for this student"
          description="Upload written essays, scanned assessment papers, medical notes, or certificates stored completely offline in IndexedDB."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="flex items-start gap-3 overflow-hidden">
                <div className="p-2 rounded-xl bg-muted/60 shrink-0">
                  {getFileIcon(file.mimeType)}
                </div>
                <div className="overflow-hidden">
                  <div className="font-semibold text-xs text-foreground truncate" title={file.name}>
                    {file.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {formatFileSize(file.size)} • {formatDate(file.createdAt)}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t flex items-center justify-end gap-1">
                {(file.mimeType.startsWith("image/") || file.mimeType.startsWith("text/")) && (
                  <button
                    onClick={() => handlePreview(file)}
                    className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                    title="Preview file"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => handleDownload(file)}
                  className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-accent"
                  title="Download file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeletingFile(file)}
                  className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title="Delete file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <Modal
          isOpen={true}
          onClose={closePreview}
          title={previewFile.file.name}
          description={`${formatFileSize(previewFile.file.size)} • ${previewFile.file.mimeType}`}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {previewFile.objectUrl && (
              <div className="flex items-center justify-center p-4 bg-muted/30 rounded-xl overflow-hidden max-h-[60vh]">
                <img
                  src={previewFile.objectUrl}
                  alt={previewFile.file.name}
                  className="max-h-full max-w-full rounded object-contain"
                />
              </div>
            )}

            {previewFile.textContent !== undefined && (
              <pre className="p-4 rounded-xl bg-muted/50 border text-xs font-mono whitespace-pre-wrap overflow-y-auto max-h-[50vh]">
                {previewFile.textContent}
              </pre>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => filesRepository.downloadFile(previewFile.file)}
              >
                <Download className="w-4 h-4 mr-1.5" /> Download
              </Button>
              <Button size="sm" onClick={closePreview}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete File Confirmation Modal with Password */}
      <ConfirmationModal
        isOpen={deletingFile !== null}
        onClose={() => setDeletingFile(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Stored Document"
        message={`Are you sure you want to permanently delete "${deletingFile?.name}" from local storage?`}
        confirmText="Delete Document"
        variant="destructive"
        requirePassword={true}
      />
    </div>
  );
}
