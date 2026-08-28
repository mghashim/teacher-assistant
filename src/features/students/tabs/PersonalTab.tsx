import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { studentsRepository } from "@/db/repositories/students.repository";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { CheckCircle2, User, Phone } from "lucide-react";
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

            <Select
              label="Assigned Class"
              value={formData.classId}
              onChange={(e) => handleChange("classId", Number(e.target.value))}
            >
              {classes?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>

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
