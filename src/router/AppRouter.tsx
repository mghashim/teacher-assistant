import { createHashRouter, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ClassesPage } from "@/features/classes/ClassesPage";
import { ClassDetailPage } from "@/features/classes/ClassDetailPage";
import { StudentsPage } from "@/features/students/StudentsPage";
import { StudentProfilePage } from "@/features/students/StudentProfilePage";
import { GradesPage } from "@/features/grades/GradesPage";
import { TasksPage } from "@/features/tasks/TasksPage";
import { SettingsPage } from "@/features/settings/SettingsPage";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: "classes",
        element: <ClassesPage />,
      },
      {
        path: "classes/:id",
        element: <ClassDetailPage />,
      },
      {
        path: "students",
        element: <StudentsPage />,
      },
      {
        path: "students/:id",
        element: <StudentProfilePage />,
      },
      {
        path: "grades",
        element: <GradesPage />,
      },
      {
        path: "assessments",
        element: <GradesPage />,
      },
      {
        path: "tasks",
        element: <TasksPage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);
