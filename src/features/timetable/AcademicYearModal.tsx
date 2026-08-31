import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  settingsRepository,
  DEFAULT_ACADEMIC_YEAR,
} from "@/db/repositories/settings.repository";
import { formatDate } from "@/lib/utils";
import type { AcademicYearConfig, SchoolHoliday } from "@/types/database";
import {
  Calendar,
  Palmtree,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RotateCcw,
} from "lucide-react";

interface AcademicYearModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (config: AcademicYearConfig) => void;
}

const HOLIDAY_TYPES = [
  { value: "break", label: "Half Term / Term Break" },
  { value: "holiday", label: "School Holiday (Winter/Spring/Summer)" },
  { value: "inset", label: "Teacher INSET / Training Day" },
  { value: "bank-holiday", label: "Public / Bank Holiday" },
  { value: "other", label: "Other School Closure" },
];

export function AcademicYearModal({
  isOpen,
  onClose,
  onSaved,
}: AcademicYearModalProps) {
  const [config, setConfig] = useState<AcademicYearConfig>(DEFAULT_ACADEMIC_YEAR);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");

  // New holiday sub-form state
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayStart, setNewHolidayStart] = useState("");
  const [newHolidayEnd, setNewHolidayEnd] = useState("");
  const [newHolidayType, setNewHolidayType] = useState<SchoolHoliday["type"]>("break");

  useEffect(() => {
    if (isOpen) {
      settingsRepository.getAcademicYearConfig().then((cfg) => {
        setConfig(cfg);
        setError("");
        setSaveSuccess(false);
      });
    }
  }, [isOpen]);

  const handleAddHoliday = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName.trim() || !newHolidayStart || !newHolidayEnd) {
      setError("Please fill in Holiday Name, Start Date, and End Date.");
      return;
    }
    if (newHolidayStart > newHolidayEnd) {
      setError("Holiday End Date must be after or equal to Start Date.");
      return;
    }

    const newHoliday: SchoolHoliday = {
      id: `hol_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: newHolidayName.trim(),
      startDate: newHolidayStart,
      endDate: newHolidayEnd,
      type: newHolidayType,
    };

    const updatedHolidays = [...config.holidays, newHoliday].sort((a, b) =>
      a.startDate.localeCompare(b.startDate)
    );

    setConfig({
      ...config,
      holidays: updatedHolidays,
    });

    setNewHolidayName("");
    setNewHolidayStart("");
    setNewHolidayEnd("");
    setError("");
  };

  const handleDeleteHoliday = (id: string) => {
    setConfig({
      ...config,
      holidays: config.holidays.filter((h) => h.id !== id),
    });
  };

  const handleResetDefaults = () => {
    if (confirm("Reset academic year and school holiday dates back to standard default template?")) {
      setConfig(DEFAULT_ACADEMIC_YEAR);
    }
  };

  const handleSaveAll = async () => {
    if (!config.startDate || !config.endDate) {
      setError("Academic Year Start and End dates are required.");
      return;
    }
    if (config.startDate >= config.endDate) {
      setError("Academic Year End Date must be after Start Date.");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await settingsRepository.setAcademicYearConfig(config);
      setSaveSuccess(true);
      onSaved?.(config);
      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      setError((err as Error).message || "Failed to save academic year settings.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Academic Year & Custom School Holidays"
      description="Define the exact school year duration and customized holidays to stop lessons outside term dates."
      maxWidth="2xl"
    >
      <div className="space-y-6 text-xs">
        {/* Alerts */}
        {saveSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Academic year and school holidays saved successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Section 1: Academic Year Duration */}
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-sm text-foreground">
                Academic Year Boundary
              </h3>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Standard Template
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Classes and lesson reminders will only run between these two dates. Dates before or after will show as out of session.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              label="Academic Year Title"
              value={config.name}
              onChange={(e) => setConfig({ ...config, name: e.target.value })}
              placeholder="e.g. 2026-2027"
              required
            />
            <Input
              label="Term Starts (Begin Date)"
              type="date"
              value={config.startDate}
              onChange={(e) => setConfig({ ...config, startDate: e.target.value })}
              required
            />
            <Input
              label="Term Ends (Finish Date)"
              type="date"
              value={config.endDate}
              onChange={(e) => setConfig({ ...config, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        {/* Section 2: Custom School Holidays & Breaks */}
        <div className="p-4 rounded-xl border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-foreground">
                Customized School Holidays & INSET Days ({config.holidays.length})
              </h3>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            On these dates, the calendar highlights the holiday and pauses lesson schedules and reminders.
          </p>

          {/* Existing Holidays List */}
          <div className="max-h-[220px] overflow-y-auto space-y-2 border rounded-lg p-2 bg-muted/20">
            {config.holidays.length === 0 ? (
              <p className="text-center text-muted-foreground italic py-3">
                No custom holidays added yet. Add one below.
              </p>
            ) : (
              config.holidays.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-lg border bg-card flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-foreground flex items-center gap-2">
                      <span>{h.name}</span>
                      <Badge variant="secondary" className="text-[10px] capitalize font-normal">
                        {h.type || "Holiday"}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {formatDate(h.startDate)} → {formatDate(h.endDate)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteHoliday(h.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded hover:bg-destructive/10 transition-colors"
                    title="Remove Holiday"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add Holiday Sub-Form */}
          <form
            onSubmit={handleAddHoliday}
            className="pt-2 border-t space-y-3 bg-muted/30 p-3 rounded-lg border"
          >
            <span className="font-semibold text-foreground block text-[11px]">
              + Add School Holiday / Inset Day / Closure:
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <Input
                  placeholder="Holiday Name (e.g. Spring Half Term)..."
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  required
                />
              </div>

              <Select
                value={newHolidayType}
                onChange={(e) => setNewHolidayType(e.target.value as SchoolHoliday["type"])}
                options={HOLIDAY_TYPES}
              />

              <div className="flex items-center gap-1">
                <Button type="submit" size="sm" variant="outline" className="w-full h-9 text-xs gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Holiday Start Date"
                type="date"
                value={newHolidayStart}
                onChange={(e) => setNewHolidayStart(e.target.value)}
                required
              />
              <Input
                label="Holiday End Date"
                type="date"
                value={newHolidayEnd}
                onChange={(e) => setNewHolidayEnd(e.target.value)}
                required
              />
            </div>
          </form>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>

          <Button
            onClick={handleSaveAll}
            disabled={isSaving}
            isLoading={isSaving}
            className="gap-1.5 font-semibold"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Save Academic Year & Holidays</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
