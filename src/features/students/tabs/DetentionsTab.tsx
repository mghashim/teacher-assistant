import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { detentionsRepository } from "@/db/repositories/detentions.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { DetentionModal, DETENTION_TYPES } from "./DetentionModal";
import { formatDate } from "@/lib/utils";
import {
  AlertTriangle,
  Plus,
  Edit2,
  Trash2,
  Filter,
} from "lucide-react";
import type { Student, Detention, DetentionType } from "@/types/database";

interface DetentionsTabProps {
  student: Student;
}

export function DetentionsTab({ student }: DetentionsTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDetention, setEditingDetention] = useState<Detention | null>(null);
  const [deletingDetention, setDeletingDetention] = useState<Detention | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const detentionsList = useLiveQuery(
    () => db.detentions.where("studentId").equals(student.id!).reverse().sortBy("detentionDate"),
    [student.id]
  );

  const filteredDetentions = useMemo(() => {
    if (!detentionsList) return [];
    if (filterType === "all") return detentionsList;
    return detentionsList.filter((d) => d.type === filterType);
  }, [detentionsList, filterType]);

  const handleDeleteConfirm = async () => {
    if (!deletingDetention?.id) return;
    await detentionsRepository.delete(deletingDetention.id);
    setDeletingDetention(null);
  };

  const getDetentionTypeBadge = (type: DetentionType) => {
    switch (type) {
      case "break":
        return <Badge variant="warning">Break Detention</Badge>;
      case "lunch":
        return <Badge variant="destructive">Lunch Detention</Badge>;
      case "8:00-am":
      case "morning-8am":
      case "8:00 am":
        return <Badge variant="info">8:00 am Detention</Badge>;
      case "after-school":
        return <Badge variant="purple">After School</Badge>;
      case "department":
        return <Badge variant="info">Department</Badge>;
      default:
        return <Badge variant="secondary">{type || "Other"}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Count */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Permanent Detention History
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold tracking-tight">
                {detentionsList?.length ?? 0} Total Detentions
              </span>
              {(detentionsList?.length ?? 0) === 0 ? (
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  • Clean behavioural record
                </span>
              ) : (
                <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                  • Disciplinary record active
                </span>
              )}
            </div>
          </div>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          variant="destructive"
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Detention
        </Button>
      </div>

      {/* Filter Toolbar */}
      {detentionsList && detentionsList.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter by Type:
          </span>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
          >
            <option value="all">All Detention Types ({detentionsList.length})</option>
            {DETENTION_TYPES.map((dt) => (
              <option key={dt.value} value={dt.value}>
                {dt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Detentions Table */}
      {!detentionsList || detentionsList.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="No detentions recorded"
          description="This student has no detention records on file."
          actionLabel="Log Detention"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Notes & Parent Follow-up</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDetentions.map((det) => (
                  <tr key={det.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {formatDate(det.detentionDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getDetentionTypeBadge(det.type)}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground max-w-sm">
                      {det.reason}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground italic max-w-xs">
                      {det.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingDetention(det)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground"
                          title="Edit detention"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingDetention(det)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive"
                          title="Delete detention"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Detention Modal */}
      <DetentionModal
        isOpen={isAddModalOpen || editingDetention !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingDetention(null);
        }}
        defaultStudentId={student.id}
        defaultClassId={student.classId}
        initialData={editingDetention}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingDetention !== null}
        onClose={() => setDeletingDetention(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Detention Record?"
        message={`Are you sure you want to delete this detention record (${formatDate(deletingDetention?.detentionDate)} - ${deletingDetention?.reason})?`}
        confirmText="Delete Record"
      />
    </div>
  );
}
