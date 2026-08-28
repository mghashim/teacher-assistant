import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { homeworkRepository } from "@/db/repositories/homework.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { HomeworkModal } from "./HomeworkModal";
import { formatDate } from "@/lib/utils";
import {
  FileCheck,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Filter,
} from "lucide-react";
import type { Student, Homework } from "@/types/database";

interface HomeworkTabProps {
  student: Student;
}

export function HomeworkTab({ student }: HomeworkTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingHomework, setEditingHomework] = useState<Homework | null>(null);
  const [deletingHomework, setDeletingHomework] = useState<Homework | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterApproved, setFilterApproved] = useState<string>("all");

  const homeworkList = useLiveQuery(
    () => db.homework.where("studentId").equals(student.id!).reverse().sortBy("homeworkDate"),
    [student.id]
  );

  const filteredHomework = useMemo(() => {
    if (!homeworkList) return [];
    return homeworkList.filter((hw) => {
      if (filterType !== "all" && hw.type !== filterType) return false;
      if (filterApproved === "approved" && !hw.approved) return false;
      if (filterApproved === "unapproved" && hw.approved) return false;
      return true;
    });
  }, [homeworkList, filterType, filterApproved]);

  const stats = useMemo(() => {
    if (!homeworkList || homeworkList.length === 0) {
      return { total: 0, approvedCount: 0, approvalRate: 0 };
    }
    const approvedCount = homeworkList.filter((h) => h.approved).length;
    const approvalRate = Math.round((approvedCount / homeworkList.length) * 100);
    return { total: homeworkList.length, approvedCount, approvalRate };
  }, [homeworkList]);

  const handleToggleApproval = async (hw: Homework) => {
    if (!hw.id) return;
    await homeworkRepository.toggleApproval(hw.id, !hw.approved);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingHomework?.id) return;
    await homeworkRepository.delete(deletingHomework.id);
    setDeletingHomework(null);
  };

  return (
    <div className="space-y-6">
      {/* Header & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-card border shadow-sm">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Homework Submissions
            </div>
            <div className="text-2xl font-bold tracking-tight mt-0.5">
              {stats.total} Records
            </div>
          </div>

          <div className="border-l pl-6">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Approval Rate
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className={`text-2xl font-bold tracking-tight ${
                  stats.approvalRate >= 80
                    ? "text-emerald-600 dark:text-emerald-400"
                    : stats.approvalRate >= 60
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {stats.approvalRate}%
              </span>
              <span className="text-xs text-muted-foreground">
                ({stats.approvedCount} approved)
              </span>
            </div>
          </div>
        </div>

        <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-1.5 self-start sm:self-auto">
          <Plus className="w-4 h-4" /> Add Homework
        </Button>
      </div>

      {/* Filter Toolbar */}
      {homeworkList && homeworkList.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          <select
            value={filterApproved}
            onChange={(e) => setFilterApproved(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
          >
            <option value="all">All Approval Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="unapproved">Pending / Unapproved</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-sm"
          >
            <option value="all">All Homework Types</option>
            {Array.from(new Set(homeworkList.map((h) => h.type))).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Homework Table */}
      {!homeworkList || homeworkList.length === 0 ? (
        <EmptyState
          icon={FileCheck}
          title="No homework records for this student"
          description="Log homework tasks, marks, and teacher approvals to monitor student independent study."
          actionLabel="Add First Homework"
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
                  <th className="px-4 py-3">Homework Title</th>
                  <th className="px-4 py-3 text-center">Mark</th>
                  <th className="px-4 py-3 text-center">Approved</th>
                  <th className="px-4 py-3">Teacher Notes</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHomework.map((hw) => (
                  <tr key={hw.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                      {formatDate(hw.homeworkDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {hw.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">
                      {hw.title}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-medium whitespace-nowrap">
                      {hw.mark !== undefined ? (
                        <span>
                          {hw.mark}
                          {hw.maxMark !== undefined && (
                            <span className="text-muted-foreground font-normal">
                              {" "}/ {hw.maxMark}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleApproval(hw)}
                        title={hw.approved ? "Click to Mark Unapproved" : "Click to Approve Homework"}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold transition-transform active:scale-95 cursor-pointer ${
                          hw.approved
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        {hw.approved ? (
                          <>
                            <Check className="w-3 h-3 stroke-[3]" />
                            <span>Approved</span>
                          </>
                        ) : (
                          <>
                            <X className="w-3 h-3 stroke-[2.5]" />
                            <span>Pending</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground italic max-w-xs truncate">
                      {hw.notes || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingHomework(hw)}
                          className="p-1 rounded text-muted-foreground hover:text-foreground"
                          title="Edit homework"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingHomework(hw)}
                          className="p-1 rounded text-muted-foreground hover:text-destructive"
                          title="Delete homework"
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

      {/* Add / Edit Homework Modal */}
      <HomeworkModal
        isOpen={isAddModalOpen || editingHomework !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingHomework(null);
        }}
        defaultStudentId={student.id}
        defaultClassId={student.classId}
        initialData={editingHomework}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingHomework !== null}
        onClose={() => setDeletingHomework(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Homework Record?"
        message={`Are you sure you want to delete "${deletingHomework?.title}"?`}
        confirmText="Delete Record"
      />
    </div>
  );
}
