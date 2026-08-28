import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { notesRepository } from "@/db/repositories/notes.repository";
import type { TeacherNote, NoteCategory } from "@/types/database";

const NOTE_CATEGORIES: Array<{ value: NoteCategory; label: string }> = [
  { value: "general", label: "General Observation" },
  { value: "academic", label: "Academic" },
  { value: "behaviour", label: "Behaviour" },
  { value: "progress", label: "Progress & Effort" },
  { value: "parent-communication", label: "Parent Communication" },
  { value: "achievement", label: "Praise & Achievement" },
  { value: "concern", label: "Concern / Pastoral" },
];

interface NoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: number;
  initialData?: TeacherNote | null;
  onSaved?: (noteId: number) => void;
}

export function NoteModal({
  isOpen,
  onClose,
  studentId,
  initialData,
  onSaved,
}: NoteModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<NoteCategory>("general");
  const [content, setContent] = useState("");
  const [noteDate, setNoteDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setCategory(initialData.category || "general");
      setContent(initialData.content);
      setNoteDate(initialData.noteDate);
    } else {
      setTitle("");
      setCategory("general");
      setContent("");
      setNoteDate(new Date().toISOString().split("T")[0]);
    }
    setError("");
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError("Note content is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      if (initialData && initialData.id) {
        await notesRepository.update(initialData.id, {
          title: title.trim() || undefined,
          category,
          content: content.trim(),
          noteDate,
        });
        onSaved?.(initialData.id);
      } else {
        const newId = await notesRepository.create({
          studentId,
          title: title.trim() || undefined,
          category,
          content: content.trim(),
          noteDate,
        });
        onSaved?.(newId);
      }
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to save observation note.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Observation" : "Add Teacher Observation"}
      description="Record academic milestones, behavioural observations, or parent call summaries."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Observation Category"
            value={category}
            onChange={(e) => setCategory(e.target.value as NoteCategory)}
            options={NOTE_CATEGORIES}
            required
          />

          <Input
            label="Date of Observation"
            type="date"
            value={noteDate}
            onChange={(e) => setNoteDate(e.target.value)}
            required
          />
        </div>

        <Input
          label="Headline / Title (Optional)"
          placeholder="e.g. Arabic Storytelling Competition Nomination"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <Textarea
          label="Observation Content"
          placeholder="Detailed notes, context, agreements made with pupil or parent..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          required
        />

        <div className="flex items-center justify-end gap-3 pt-3 border-t">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialData ? "Save Changes" : "Record Observation"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
