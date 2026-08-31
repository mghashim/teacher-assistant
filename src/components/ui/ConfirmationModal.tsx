import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, Trash2, Lock, Eye, EyeOff } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { securityService } from "@/services/security.service";

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  isLoading?: boolean;
  /**
   * If true or if variant is destructive, prompts for the master password before executing onConfirm.
   * Defaults to true for destructive actions.
   */
  requirePassword?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
  requirePassword,
}: ConfirmationModalProps) {
  const needsPassword = requirePassword ?? (variant === "destructive");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setPasswordError("");
      setShowPassword(false);
      // Small timeout to ensure DOM focus after modal transitions in
      setTimeout(() => {
        if (needsPassword && inputRef.current) {
          inputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, needsPassword]);

  const handleConfirmSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (needsPassword) {
      if (!password.trim()) {
        setPasswordError("Password is required to confirm this action.");
        inputRef.current?.focus();
        return;
      }

      const isValid = securityService.verifyPassword(password);
      if (!isValid) {
        setPasswordError("Incorrect master password. Please try again.");
        inputRef.current?.focus();
        return;
      }
    }

    setPasswordError("");
    onConfirm();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="md">
      <form onSubmit={handleConfirmSubmit} className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-full shrink-0 ${
              variant === "destructive"
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            }`}
          >
            {variant === "destructive" ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-base text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {needsPassword && (
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between text-xs">
              <label
                htmlFor="delete-confirm-password"
                className="font-medium text-foreground flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Enter Master Password to Confirm:</span>
              </label>
              {!securityService.hasCustomPassword() && (
                <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                  Default: admin
                </span>
              )}
            </div>

            <div className="relative">
              <Input
                id="delete-confirm-password"
                ref={inputRef}
                type={showPassword ? "text" : "password"}
                placeholder="Enter password..."
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
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            type="submit"
            variant={variant === "destructive" ? "destructive" : "default"}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
