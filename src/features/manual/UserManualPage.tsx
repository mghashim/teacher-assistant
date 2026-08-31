import { MonitorSmartphone, ShieldCheck, Download, LayoutDashboard, CalendarRange } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";

export function UserManualPage() {
  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Manual & Best Practices</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everything you need to know to securely use Teacher Assistant across all your devices.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Section 1: Installation & Offline Use */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <MonitorSmartphone className="w-5 h-5" />
              1. Installation & Offline Guarantee
            </CardTitle>
            <CardDescription>
              How to set up the app on your tablet, PC, or phone for 100% offline usage.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              Teacher Assistant is an <strong>Offline-First PWA (Progressive Web App)</strong>. This means it runs entirely inside your device, requiring zero internet connection once installed.
            </p>
            <div className="p-4 rounded-xl bg-muted/40 border border-border">
              <h4 className="font-semibold mb-2">Best Practice: Install as an App (Add to Home Screen)</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
                <li><strong>Samsung/Android Tablets:</strong> Open the app in Chrome or Samsung Internet. Tap the <strong>⋮ Menu</strong> and select <strong>"Add to Home screen"</strong>.</li>
                <li><strong>iPads:</strong> Open in Safari. Tap the Share icon and select <strong>"Add to Home Screen"</strong>.</li>
                <li><strong>Windows/Mac:</strong> Open in Chrome or Edge. Click the install icon (usually a screen with a down arrow) in the right side of the address bar.</li>
              </ul>
              <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                ⚠️ Why this is important: Installing the app gives it special "Persistent Storage" rights, preventing the browser from accidentally deleting your data when disk space is low.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Data Safety & Backups */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
              2. Data Safety & Smart Backups
            </CardTitle>
            <CardDescription>
              How your data is stored and how to prevent data loss.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <p>
              All your students, classes, grades, and uploaded files (like PDFs) are saved directly into your device's private <strong>IndexedDB</strong>. They are never sent to a cloud server. 
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <h4 className="font-semibold mb-1 flex items-center gap-1.5">
                  <Download className="w-4 h-4" /> The 7-Day Backup Rule
                </h4>
                <p className="text-xs">
                  Because data lives only on your tablet, if you lose the tablet, you lose the data. 
                  You should generate a backup file regularly. The app will flash a smart reminder banner if you haven't backed up in 7 days.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-900 dark:text-indigo-200">
                <h4 className="font-semibold mb-1">Automated Backups</h4>
                <p className="text-xs">
                  Go to <strong>Settings & Backup</strong> and enable <strong>Auto-Backup (Weekly)</strong>. 
                  When enabled, the app will automatically attempt to download a backup file to your device's Downloads folder if you have it open and 7 days have passed.
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
              <strong>Restoring Data:</strong> When you restore a backup file, the system inspects it first. It will warn you if restoring the backup would overwrite newer data you've created recently.
            </p>
          </CardContent>
        </Card>

        {/* Section 3: Academic Year & Timetable */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <CalendarRange className="w-5 h-5" />
              3. Timetable, Reminders & Holidays
            </CardTitle>
            <CardDescription>
              Configuring your school schedule for automatic lesson management.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <ul className="space-y-3">
              <li className="p-3 rounded-lg border bg-card">
                <strong>Setting Term Dates:</strong> Navigate to <em>Settings</em> &gt; <em>Academic Year & Holidays</em>. Define your start and end dates. Lessons outside these dates are automatically paused and hidden from the calendar.
              </li>
              <li className="p-3 rounded-lg border bg-card">
                <strong>Custom School Holidays:</strong> You can add Half Terms, Winter Breaks, or single INSET days. During these dates, your recurring timetable is paused, and lesson reminders will be silenced.
              </li>
              <li className="p-3 rounded-lg border bg-card">
                <strong>Audio Chimes:</strong> On the Timetable page, click <em>"Configure Lesson Alerts"</em> to enable a gentle audio chime 5 minutes before your next class starts. The app must remain open (or in the background) for chimes to play.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Section 4: Security & Master Password */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2 text-slate-700 dark:text-slate-300">
              <LayoutDashboard className="w-5 h-5" />
              4. Master Deletion Password
            </CardTitle>
            <CardDescription>
              Preventing accidental data wipes.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed">
            <p className="mb-2">
              To prevent you (or a student tapping your tablet) from accidentally deleting important records (like grades, detentions, or student profiles), all deletion actions require a <strong>Master Password</strong>.
            </p>
            <p className="text-muted-foreground">
              By default, this password is set to <strong>"admin"</strong>. You can (and should) change this to a secure, personal PIN or password in the Settings page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
