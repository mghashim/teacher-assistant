import { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { interventionsRepository } from "@/db/repositories/interventions.repository";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import {
  InterventionModal,
  INTERVENTION_TYPES,
  calculateDuration,
} from "./InterventionModal";
import { formatDate } from "@/lib/utils";
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  Filter,
  Star,
  Clock,
  Award,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import type { Student, Intervention, InterventionType } from "@/types/database";

interface InterventionsTabProps {
  student: Student;
}

export function InterventionsTab({ student }: InterventionsTabProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingIntervention, setEditingIntervention] = useState<Intervention | null>(null);
  const [deletingIntervention, setDeletingIntervention] = useState<Intervention | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");

  const interventionsList = useLiveQuery(
    () => db.interventions.where("studentId").equals(student.id!).reverse().sortBy("date"),
    [student.id]
  );

  const filteredInterventions = useMemo(() => {
    if (!interventionsList) return [];
    return interventionsList.filter((item) => {
      const matchType = filterType === "all" || item.type === filterType;
      const matchRating =
        filterRating === "all" || String(item.effectiveness) === filterRating;
      return matchType && matchRating;
    });
  }, [interventionsList, filterType, filterRating]);

  // Statistics
  const stats = useMemo(() => {
    if (!interventionsList || interventionsList.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        highImpactCount: 0,
        highImpactRate: 0,
        totalMinutes: 0,
      };
    }

    const total = interventionsList.length;
    const sumRating = interventionsList.reduce((acc, curr) => acc + (curr.effectiveness || 0), 0);
    const averageRating = Math.round((sumRating / total) * 10) / 10;
    const highImpactCount = interventionsList.filter((i) => i.effectiveness >= 4).length;
    const highImpactRate = Math.round((highImpactCount / total) * 100);

    // Calculate total minutes
    let totalMinutes = 0;
    for (const item of interventionsList) {
      if (item.startTime && item.endTime) {
        const [sH, sM] = item.startTime.split(":").map(Number);
        const [eH, eM] = item.endTime.split(":").map(Number);
        if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
          let mins = eH * 60 + eM - (sH * 60 + sM);
          if (mins < 0) mins += 24 * 60;
          totalMinutes += mins;
        }
      }
    }

    return {
      total,
      averageRating,
      highImpactCount,
      highImpactRate,
      totalMinutes,
    };
  }, [interventionsList]);

  const handleDeleteConfirm = async () => {
    if (!deletingIntervention?.id) return;
    await interventionsRepository.delete(deletingIntervention.id);
    setDeletingIntervention(null);
  };

  const handleQuickRatingChange = async (intervention: Intervention, newRating: number) => {
    if (!intervention.id) return;
    await interventionsRepository.updateEffectiveness(intervention.id, newRating);
  };

  const getTypeBadge = (type: InterventionType) => {
    switch (type) {
      case "1-to-1":
        return (
          <Badge variant="info" className="gap-1 text-xs">
            <UserCheck className="w-3 h-3" /> 1 to 1
          </Badge>
        );
      case "after-school":
        return (
          <Badge variant="purple" className="gap-1 text-xs">
            <Clock className="w-3 h-3" /> After School
          </Badge>
        );
      case "break-time":
        return (
          <Badge variant="warning" className="gap-1 text-xs">
            <Clock className="w-3 h-3" /> Break Time
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type || "Other"}</Badge>;
    }
  };

  const formatTotalTime = (mins: number) => {
    if (mins === 0) return "0 mins";
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (hours === 0) return `${remainingMins} mins`;
    if (remainingMins === 0) return `${hours} hrs`;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metric Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Interventions */}
        <div className="p-5 rounded-2xl bg-card border shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Interventions Logged
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {stats.total} {stats.total === 1 ? "Session" : "Sessions"}
            </div>
          </div>
        </div>

        {/* Metric 2: Average Rating */}
        <div className="p-5 rounded-2xl bg-card border shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-500 shrink-0">
            <Star className="w-6 h-6 fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Avg Effectiveness
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {stats.total > 0 ? stats.averageRating : "—"}
              </span>
              {stats.total > 0 && (
                <span className="text-xs text-muted-foreground font-medium">
                  / 5.0 Stars
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 3: High Impact Rate */}
        <div className="p-5 rounded-2xl bg-card border shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              High Impact (4-5★)
            </div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5">
              {stats.total > 0 ? `${stats.highImpactRate}%` : "—"}
              {stats.total > 0 && (
                <span className="text-xs text-muted-foreground font-normal ml-1.5">
                  ({stats.highImpactCount}/{stats.total})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Metric 4: Total Time Invested */}
        <div className="p-5 rounded-2xl bg-card border shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Support Time
            </div>
            <div className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
              {formatTotalTime(stats.totalMinutes)}
            </div>
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="text-muted-foreground font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filters:
          </span>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
          >
            <option value="all">All Intervention Types</option>
            {INTERVENTION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          {/* Rating Filter */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 py-1 text-xs shadow-xs"
          >
            <option value="all">All Star Ratings</option>
            <option value="5">★★★★★ (5 Stars)</option>
            <option value="4">★★★★☆ (4 Stars)</option>
            <option value="3">★★★☆☆ (3 Stars)</option>
            <option value="2">★★☆☆☆ (2 Stars)</option>
            <option value="1">★☆☆☆☆ (1 Star)</option>
          </select>

          {(filterType !== "all" || filterRating !== "all") && (
            <button
              onClick={() => {
                setFilterType("all");
                setFilterRating("all");
              }}
              className="text-primary hover:underline text-xs font-medium"
            >
              Reset Filters
            </button>
          )}
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="gap-1.5 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" /> Add Intervention
        </Button>
      </div>

      {/* Interventions Content */}
      {!interventionsList || interventionsList.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No interventions recorded yet"
          description="Log 1-to-1 coaching, after-school interventions, or break-time support sessions to track student growth."
          actionLabel="Add First Intervention"
          onAction={() => setIsAddModalOpen(true)}
        />
      ) : filteredInterventions.length === 0 ? (
        <div className="p-8 text-center bg-card border rounded-xl space-y-2">
          <p className="text-sm font-medium text-foreground">
            No interventions match your active filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilterType("all");
              setFilterRating("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time & Duration</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Intervention Notes & Strategy</th>
                  <th className="px-4 py-3 text-center">Effectiveness (1-5★)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredInterventions.map((item) => {
                  const duration = calculateDuration(item.startTime, item.endTime);
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-3.5 font-semibold text-foreground whitespace-nowrap align-top">
                        {formatDate(item.date)}
                      </td>

                      {/* Time & Duration */}
                      <td className="px-4 py-3.5 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-foreground">
                            {item.startTime} – {item.endTime}
                          </span>
                          {duration && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {duration}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap align-top">
                        {getTypeBadge(item.type)}
                      </td>

                      {/* Comment / Notes */}
                      <td className="px-4 py-3.5 text-foreground align-top max-w-md">
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {item.comment}
                        </p>
                      </td>

                      {/* 5-Star Effectiveness Display & Quick Click */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap align-top">
                        <div className="inline-flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 bg-amber-50/60 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-900/60">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => handleQuickRatingChange(item, star)}
                                className="transition-transform hover:scale-125 focus:outline-hidden"
                                title={`Set rating to ${star} star${star > 1 ? "s" : ""}`}
                              >
                                <Star
                                  className={`w-3.5 h-3.5 ${
                                    star <= (item.effectiveness || 0)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-muted-foreground/30 hover:text-amber-300"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-muted-foreground">
                            {item.effectiveness || 0} / 5 Stars
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditingIntervention(item)}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            title="Edit intervention"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingIntervention(item)}
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete intervention"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Intervention Modal */}
      <InterventionModal
        isOpen={isAddModalOpen || editingIntervention !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingIntervention(null);
        }}
        defaultStudentId={student.id}
        defaultClassId={student.classId}
        initialData={editingIntervention}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deletingIntervention !== null}
        onClose={() => setDeletingIntervention(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete Intervention Record?"
        message={`Are you sure you want to delete this intervention record from ${formatDate(deletingIntervention?.date)}? This action cannot be undone.`}
        confirmText="Delete Record"
      />
    </div>
  );
}
