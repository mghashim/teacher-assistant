# Local-First Teacher Assistant System

A modern, serverless, 100% offline-only Single Page Application (SPA) designed for teachers to manage classes, students, grades, homework, detentions, tasks, files, and academic records locally in their browser with zero backend or external database required.

---

## 🌟 Key Features

- **🔒 100% Offline & Private (Local-First)**:
  - All data is stored directly in your browser's IndexedDB via **Dexie.js**.
  - No external APIs, cloud databases, or login servers needed.
  - Native file attachments (PDFs, Word docs, images) stored directly as native `Blob` objects.

- **📊 Comprehensive Teacher Dashboard**:
  - Live statistics for classes, active pupils, today's lesson timetable, pending homework, and open tasks.
  - Quick-action modal and top bar buttons (Enter Marks, Add Student, Add Class, Add Homework, Add Assessment, Add Detention).
  - Feed of recent detentions and recent academic grades.

- **🏫 Class & Timetable Management**:
  - Classroom groups with subjects, academic year, and descriptions.
  - Recurring weekly lesson scheduler (Day of Week, Start/End times, Room, Notes).
  - Enrolled student rosters and class resource document uploads.

- **👨‍🎓 Pupil Directory & Tabbed Student Profiles**:
  - Searchable directory with class and active-status filters.
  - **Personal Info**: Auto-saving identity, contact details, parent info, and general teacher notes.
  - **Grades**: Chronological assessments history and cumulative calculated average percentage.
  - **Homework**: Submissions log with marks (e.g. `18/20`), inline **Approved** toggle, and approval rate percentage.
  - **Detentions**: Disciplinary history with types (**Break**, **Lunch**, **8:00 am**, **After School**, **Department**, **Other**), standard reason presets, and parent follow-up notes.
  - **Teacher Notes**: Timeline of observations with category tags (**Achievement/Praise**, **Parent Contact**, **Pastoral Concern**, **Progress & Effort**, **Academic**, **Behaviour**, **General**).
  - **Files & Documents**: Upload pupil files as Blobs with image/text preview, download, and deletion.

- **📝 Assessments & Gradebook Viewer**:
  - Dedicated **Assessments & Mark Sheets** tab with progress bars, class averages, and fast **Enter Marks** spreadsheet modal.
  - **Advanced Matrix Viewer**: Cross-class performance matrix with dynamic filters (classes, students, assessment types, dates) and customizable column visibility toggles.

- **✅ Task Manager**:
  - Preparation reminders and marking deadlines with checkbox completion toggling and class/student association.

- **💾 Smart 7-Day Backup & Restore Center**:
  - Automatic 7-day backup reminder banner.
  - One-click full JSON export (converts native Blobs to Base64).
  - Atomic JSON restore (converts Base64 back to Blobs and replaces tables inside a single Dexie transaction).

- **🌓 Appearance & Theme System**:
  - Clean shadcn/ui-inspired design with Light, Dark, and System Match modes.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + Class Variance Authority + Lucide Icons
- **Local Database**: Dexie.js + `dexie-react-hooks` (`useLiveQuery`)
- **Routing**: React Router DOM v7

---

## 🚀 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/mghashim/teacher-assistant.git
cd teacher-assistant
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 4. Build for production
```bash
npm run build
```
The optimized production bundle will be generated in the `dist/` directory.

---

## 📄 License
MIT License
