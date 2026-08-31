const MASTER_PASSWORD_STORAGE_KEY = "teacher_app_master_delete_password";
const DEFAULT_PASSWORD = "admin";

export const securityService = {
  /**
   * Get the current master password from local storage (or default 'admin')
   */
  getMasterPassword(): string {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_PASSWORD;
    }
    const saved = localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY);
    return saved && saved.trim() ? saved : DEFAULT_PASSWORD;
  },

  /**
   * Set a new master password
   */
  setMasterPassword(newPassword: string): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem(MASTER_PASSWORD_STORAGE_KEY, newPassword.trim());
    }
  },

  /**
   * Verify if the provided password matches the master password
   */
  verifyPassword(inputPassword: string): boolean {
    const current = this.getMasterPassword();
    return inputPassword.trim() === current.trim();
  },

  /**
   * Checks whether the user has configured a custom password
   */
  hasCustomPassword(): boolean {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }
    const saved = localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY);
    return Boolean(saved && saved.trim() && saved.trim() !== DEFAULT_PASSWORD);
  },

  /**
   * Reset the password back to default 'admin'
   */
  resetToDefault(): void {
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.removeItem(MASTER_PASSWORD_STORAGE_KEY);
    }
  },

  getDefaultPassword(): string {
    return DEFAULT_PASSWORD;
  },
};
