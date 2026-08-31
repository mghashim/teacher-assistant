import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { studentsRepository } from "@/db/repositories/students.repository";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckCircle2, User, Phone, GraduationCap, Check } from "lucide-react";
import type { Student } from "@/types/database";

interface PersonalTabProps {
  student: Student;
}

export function PersonalTab({ student }: PersonalTabProps) {
  const classes = useLiveQuery(() => db.classes.orderBy("name").toArray(), []);

  const [formData, setFormData] = useState<Student>(student);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    setFormData(student);
  }, [student]);

  // Current enrolled class IDs
  const enrolledClassIds = Array.isArray(formData.classIds) && formData.classIds.length > 0
    ? formData.classIds
    : (formData.classId ? [formData.classId] : []);

  // Auto-save helper on field change
  const handleChange = async (field: keyof Student, value: unknown) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);

    if (student.id) {
      await studentsRepository.update(student.id, { [field]: value });
      setSaveStatus("Saved automatically to local database");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  const handleToggleClass = async (classIdToToggle: number) => {
    let newClassIds: number[];
    if (enrolledClassIds.includes(classIdToToggle)) {
      newClassIds = enrolledClassIds.filter((id) => id !== classIdToToggle);
    } else {
      newClassIds = [...enrolledClassIds, classIdToToggle];
    }

    const updated = {
      ...formData,
      classIds: newClassIds,
      classId: newClassIds[0] || 0,
    };
    setFormData(updated);

    if (student.id) {
      await studentsRepository.update(student.id, {
        classIds: newClassIds,
        classId: newClassIds[0] || 0,
      });
      setSaveStatus("Enrolled classes updated");
      setTimeout(() => setSaveStatus(null), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {saveStatus && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>{saveStatus}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Identity Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preferred Name"
                placeholder="Nickname"
                value={formData.preferredName || ""}
                onChange={(e) => handleChange("preferredName", e.target.value)}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={formData.dateOfBirth || ""}
                onChange={(e) => handleChange("dateOfBirth", e.target.value)}
              />
            </div>

            {/* Enrolled Classes Multi-Select Chips */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-semibold text-foreground flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                Enrolled Classes ({enrolledClassIds.length})
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {classes?.map((c) => {
                  const isEnrolled = enrolledClassIds.includes(c.id!);
                  return (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => handleToggleClass(c.id!)}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all text-left ${
                        isEnrolled
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold"
                          : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <span className="truncate pr-2">{c.name}</span>
                      <div
                        className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 border ${
                          isEnrolled
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/40 bg-background"
                        }`}
                      >
                        {isEnrolled && <Check className="w-3 h-3" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <Checkbox
                label="Active Student Status"
                description="Controls whether the student appears in active class registers and averages"
                checked={formData.active}
                onChange={(checked) => handleChange("active", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact & Parent Details Card */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-blue-500" /> Parent / Guardian & Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Student Email"
                type="email"
                placeholder="student@school.edu"
                value={formData.email || ""}
                onChange={(e) => handleChange("email", e.target.value)}
              />
              <Input
                label="Student Phone"
                type="tel"
                placeholder="07700 900123"
                value={formData.phone || ""}
                onChange={(e) => handleChange("phone", e.target.value)}
              />
            </div>

            <Input
              label="Parent / Guardian Name"
              placeholder="e.g. Tariq Al-Mansoor"
              value={formData.parentName || ""}
              onChange={(e) => handleChange("parentName", e.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Parent Email"
                type="email"
                placeholder="parent@example.com"
                value={formData.parentEmail || ""}
                onChange={(e) => handleChange("parentEmail", e.target.value)}
              />
              <Input
                label="Parent Phone"
                type="tel"
                placeholder="07700 900456"
                value={formData.parentPhone || ""}
                onChange={(e) => handleChange("parentPhone", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* General Teacher Observations & SEN Notes */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            General Teacher Notes & Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Special educational needs, dietary notes, learning preferences, or general background info..."
            value={formData.generalNotes || ""}
            onChange={(e) => handleChange("generalNotes", e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
