import React, { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Button } from "@/components/ui/Button";
import { studentsRepository } from "@/db/repositories/students.repository";
import { AlertCircle, Check, GraduationCap } from "lucide-react";
import type { Student } from "@/types/database";

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClassId?: number;
  initialData?: Student | null;
  onSaved?: (studentId: number) => void;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function StudentModal({
  isOpen,
  onClose,
  defaultClassId,
  initialData,
  onSaved,
}: StudentModalProps) {
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [classIds, setClassIds] = useState<number[]>(
    defaultClassId ? [defaultClassId] : []
  );
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [active, setActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      const initialClassIds =
        Array.isArray(initialData.classIds) && initialData.classIds.length > 0
          ? initialData.classIds
          : initialData.classId
          ? [initialData.classId]
          : [];
      setClassIds(initialClassIds);
      setFirstName(initialData.firstName);
      setLastName(initialData.lastName);
      setPreferredName(initialData.preferredName || "");
      setDateOfBirth(initialData.dateOfBirth || "");
      setEmail(initialData.email || "");
      setPhone(initialData.phone || "");
      setParentName(initialData.parentName || "");
      setParentEmail(initialData.parentEmail || "");
      setParentPhone(initialData.parentPhone || "");
      setGeneralNotes(initialData.generalNotes || "");
      setActive(initialData.active);
    } else {
      if (defaultClassId) {
        setClassIds([defaultClassId]);
      } else if (classes && classes.length > 0) {
        setClassIds([classes[0].id!]);
      } else {
        setClassIds([]);
      }
      setFirstName("");
      setLastName("");
      setPreferredName("");
      setDateOfBirth("");
      setEmail("");
      setPhone("");
      setParentName("");
      setParentEmail("");
      setParentPhone("");
      setGeneralNotes("");
      setActive(true);
    }
    setError("");
  }, [initialData, defaultClassId, classes, isOpen]);

  const toggleClassEnrollment = (cId: number) => {
    setClassIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const emailError = useMemo(() => {
    const trimmed = email.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      return "Please enter a valid email address";
    }
    return "";
  }, [email]);

  const parentEmailError = useMemo(() => {
    const trimmed = parentEmail.trim();
    if (trimmed && !EMAIL_REGEX.test(trimmed)) {
      return "Please enter a valid parent email address";
    }
    return "";
  }, [parentEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required.");
      return;
    }
    if (classIds.length === 0) {
      setError("Please enroll the student in at least one class.");
      return;
    }
    if (emailError) {
      setError(emailError);
      return;
    }
    if (parentEmailError) {
      setError(parentEmailError);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await studentsRepository.update(initialData.id, {
          classIds,
          classId: classIds[0] || 0,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          preferredName: preferredName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          parentName: parentName.trim() || undefined,
          parentEmail: parentEmail.trim() || undefined,
          parentPhone: parentPhone.trim() || undefined,
          generalNotes: generalNotes.trim() || undefined,
          active,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await studentsRepository.create({
          classIds,
          classId: classIds[0] || 0,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          preferredName: preferredName.trim() || undefined,
          dateOfBirth: dateOfBirth || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          parentName: parentName.trim() || undefined,
          parentEmail: parentEmail.trim() || undefined,
          parentPhone: parentPhone.trim() || undefined,
          generalNotes: generalNotes.trim() || undefined,
          active,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Student Profile" : "Enroll New Student"}
      description="Enter personal information, class assignments (multiple classes supported), and parent/guardian contacts."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs font-semibold flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Multi-Class Enrollment Selection */}
        <div className="p-3.5 rounded-xl bg-card border shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              Enrolled Classes <span className="text-destructive">*</span>
            </label>
            <span className="text-xs text-muted-foreground font-medium">
              {classIds.length} {classIds.length === 1 ? "Class selected" : "Classes selected"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {classes?.map((c) => {
              const isSelected = classIds.includes(c.id!);
              return (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => toggleClassEnrollment(c.id!)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <span className="truncate pr-2">{c.name}</span>
                  <div
                    className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-muted-foreground/40 bg-background"
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <Checkbox
              label="Active Student Status"
              description="Uncheck if the student has moved or is inactive"
              checked={active}
              onChange={setActive}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="First Name"
            placeholder="e.g. Zayd"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError("");
            }}
            required
            autoFocus
          />

          <Input
            label="Last Name"
            placeholder="e.g. Al-Mansoor"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setError("");
            }}
            required
          />

          <Input
            label="Preferred Name"
            placeholder="Optional nickname"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            label="Date of Birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />

          <Input
            label="Student Email"
            type="email"
            placeholder="student@school.edu"
            value={email}
            error={emailError || undefined}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
          />

          <Input
            label="Student Phone"
            type="tel"
            placeholder="e.g. 07700 900123"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* Parent / Guardian Info */}
        <div className="pt-2 border-t space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Parent / Guardian Contact Details
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Parent / Guardian Name"
              placeholder="e.g. Tariq Al-Mansoor"
              value={parentName}
              onChange={(e) => setParentName(e.target.value)}
            />

            <Input
              label="Parent Email"
              type="email"
              placeholder="parent@example.com"
              value={parentEmail}
              error={parentEmailError || undefined}
              onChange={(e) => {
                setParentEmail(e.target.value);
                setError("");
              }}
            />

            <Input
              label="Parent Phone"
              type="tel"
              placeholder="e.g. 07700 900456"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
            />
          </div>
        </div>

        <Textarea
          label="General Teacher Notes / SEN / Observations"
          placeholder="Special notes, dietary/medical requirements, learning style preferences..."
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          rows={2}
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={Boolean(emailError || parentEmailError) || isSubmitting}
            isLoading={isSubmitting}
          >
            {initialData ? "Save Changes" : "Enroll Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
