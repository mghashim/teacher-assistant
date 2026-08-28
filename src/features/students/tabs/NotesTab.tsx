import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { notesRepository } from "@/db/repositories/notes.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { NoteModal } from "./NoteModal";
import { formatDate } from "@/lib/utils";
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Sparkles,
  Phone,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import type { Student, TeacherNote, NoteCategory } from "@/types/database";

interface NotesTabProps {
  student: Student;
}

export function NotesTab({ student }: NotesTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<TeacherNote | null>(null);
  const [deletingNote, setDeletingNote] = useState<TeacherNote | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const notesList = useLiveQuery(
    () => db.notes.where("studentId").equals(student.id!).reverse().sortBy("noteDate"),
    [student.id]
  );

  const filteredNotes = useMemo(() => {
    if (!notesList) return [];
    if (filterCategory === "all") return notesList;
    return notesList.filter((n) => n.category === filterCategory);
  }, [notesList, filterCategory]);

  const handleDeleteConfirm = async () => {
    if (!deletingNote?.id) return;
    await notesRepository.delete(deletingNote.id);
    setDeletingNote(null);
  };

  const getCategoryBadge = (cat?: NoteCategory) => {
    switch (cat) {
      case "achievement":
        return (
          <Badge variant="success" className="gap-1 text-[10px]">
            <Sparkles className="w-3 h-3" /> Praise / Achievement
          </Badge>
        );
      case "parent-communication":
        return (
          <Badge variant="info" className="gap-1 text-[10px]">
            <Phone className="w-3 h-3" /> Parent Call
          </Badge>
        );
      case "concern":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px]">
            <AlertCircle className="w-3 h-3" /> Pastoral Concern
          </Badge>
        );
      case "progress":
        return (
          <Badge variant="purple" className="gap-1 text-[10px]">
            <TrendingUp className="w-3 h-3" /> Progress
          </Badge>
        );
      case "behaviour":
        return <Badge variant="warning">Behaviour</Badge>;
      case "academic":
        return <Badge variant="secondary">Academic</Badge>;
      default:
        return <Badge variant="outline">General</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chronological Observations Log
          </div>
          <div className="text-2xl font-bold tracking-tight mt-0.5">
            {notesList?.length ?? 0} Teacher Notes
          </div>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Observation
        </Button>
      </div>

      {/* Filter toolbar */}
      {notesList && notesList.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter by Category:
          </span>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
          >
            <option value="all">All Categories ({notesList.length})</option>
            <option value="achievement">Praise & Achievement</option>
            <option value="parent-communication">Parent Communication</option>
            <option value="concern">Pastoral Concern</option>
            <option value="progress">Progress & Effort</option>
            <option value="academic">Academic</option>
            <option value="behaviour">Behaviour</option>
            <option value="general">General</option>
          </select>
        </div>
      )}

      {/* Notes Timeline */}
      {!notesList || notesList.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No observations recorded"
          description="Maintain private notes regarding progress, parental contacts, achievements, and pastoral concerns."
          actionLabel="Add Observation"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-5 rounded-xl border bg-card hover:border-border/80 transition-all shadow-sm space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getCategoryBadge(note.category)}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(note.noteDate)}
                    </span>
                  </div>
                  {note.title && (
                    <h3 className="font-bold text-sm text-foreground pt-1">
                      {note.title}
                    </h3>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditingNote(note)}
                    className="p-1 rounded text-muted-foreground hover:text-foreground"
                    title="Edit observation"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeletingNote(note)}
                    className="p-1 rounded text-muted-foreground hover:text-destructive"
                    title="Delete observation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Note Modal */}
      <NoteModal
        isOpen={isAddModalOpen || editingNote !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingNote(null);
        }}
        studentId={student.id!}
        initialData={editingNote}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingNote !== null}
        onClose={() => setDeletingNote(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Observation Note?"
        message="Are you sure you want to permanently delete this observation note?"
        confirmText="Delete Note"
      />
    </div>
  );
}
