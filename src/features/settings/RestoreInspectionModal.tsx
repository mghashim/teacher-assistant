import React, { useState, useEffect, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { securityService } from "@/services/security.service";
import type { BackupInspectionResult } from "@/db/backup/backup.service";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Lock,
  Eye,
  EyeOff,
  Database,
  Calendar,
} from "lucide-react";

interface RestoreInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmRestore: () => void;
  onExportCurrentBackup: () => void;
  inspection: BackupInspectionResult | null;
  isLoading?: boolean;
}

export function RestoreInspectionModal({
  isOpen,
  onClose,
  onConfirmRestore,
  onExportCurrentBackup,
  inspection,
  isLoading = false,
}: RestoreInspectionModalProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setPasswordError("");
      setShowPassword(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!inspection) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setPasswordError("Master password is required to restore database.");
      inputRef.current?.focus();
      return;
    }

    if (!securityService.verifyPassword(password)) {
      setPasswordError("Incorrect master password. Please try again.");
      inputRef.current?.focus();
      return;
    }

    setPasswordError("");
    onConfirmRestore();
  };

  const {
    backupDateFormatted,
    totalBackupRecords,
    hasNewerLocalData,
    totalNewerLocalRecords,
    newerBreakdown,
  } = inspection;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Restore Database from Backup"
      description="Review backup timestamp and conflict inspection before overwriting local data."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Backup Meta Summary */}
        <div className="p-3.5 rounded-xl bg-muted/40 border flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-foreground font-medium">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Backup File Created:</span>
            <span className="font-bold">{backupDateFormatted}</span>
          </div>
          <Badge variant="secondary" className="font-mono text-[11px]">
            {totalBackupRecords} records in file
          </Badge>
        </div>

        {/* Warning if newer data exists */}
        {hasNewerLocalData ? (
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-amber-900 dark:text-amber-200">
                  Warning: Newer Local Data Detected ({totalNewerLocalRecords} record
                  {totalNewerLocalRecords === 1 ? "" : "s"})
                </div>
                <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                  You have created or edited data <strong>after</strong> this backup file was created on{" "}
                  <strong>{backupDateFormatted}</strong>. Restoring this older backup will permanently overwrite
                  and remove the following newer items:
                </p>
              </div>
            </div>

            {/* Breakdown of newer records */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {newerBreakdown.students > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.students}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Students</span>
                </div>
              )}

              {newerBreakdown.grades > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.grades}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Marks/Grades</span>
                </div>
              )}

              {newerBreakdown.classes > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.classes}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Classes</span>
                </div>
              )}

              {newerBreakdown.homework > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.homework}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Homework</span>
                </div>
              )}

              {newerBreakdown.detentions > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.detentions}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Detentions</span>
                </div>
              )}

              {newerBreakdown.notes > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.notes}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Notes</span>
                </div>
              )}

              {newerBreakdown.tasks > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.tasks}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Tasks</span>
                </div>
              )}

              {newerBreakdown.files > 0 && (
                <div className="p-2 rounded-lg bg-background/80 border text-xs text-center font-medium">
                  <span className="text-amber-900 dark:text-amber-100 font-bold block">
                    {newerBreakdown.files}
                  </span>
                  <span className="text-muted-foreground text-[11px]">Newer Documents</span>
                </div>
              )}
            </div>

            {/* Quick Safety Button to Backup Current State */}
            <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between">
              <span className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                Want to save your current database first?
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportCurrentBackup}
                className="gap-1.5 text-xs bg-background hover:bg-background/90"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Backup Current Data First</span>
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center gap-2.5 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Safe to Restore:</strong> No newer entries were created since this backup date.
            </span>
          </div>
        )}

        {/* Master Password Authorization */}
        <div className="pt-2 border-t space-y-2">
          <div className="flex items-center justify-between text-xs">
            <label
              htmlFor="restore-master-password"
              className="font-medium text-foreground flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              <span>Enter Master Password to Authorize Overwrite:</span>
            </label>
            {!securityService.hasCustomPassword() && (
              <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                Default: admin
              </span>
            )}
          </div>

          <div className="relative">
            <Input
              id="restore-master-password"
              ref={inputRef}
              type={showPassword ? "text" : "password"}
              placeholder="Enter master password..."
              value={password}
              error={passwordError || undefined}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              className="pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors p-1"
              title={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="destructive"
            isLoading={isLoading}
            className="gap-1.5 font-semibold"
          >
            <Database className="w-4 h-4" />
            <span>Confirm & Overwrite Database</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
