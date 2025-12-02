"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/user-menu";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [status, session, router]);

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingName(true);
    setNameMessage(null);

    try {
      const response = await fetch("/api/user/update-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (response.ok) {
        setNameMessage({ type: "success", text: "Name updated successfully!" });
        // Update the session with new name
        await update();
      } else {
        setNameMessage({ type: "error", text: data.error || "Failed to update name" });
      }
    } catch (error) {
      setNameMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsUpdatingName(false);
    }
  };

  const validatePassword = (password: string) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    const allMet = Object.values(requirements).every(req => req);
    return { requirements, allMet };
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPassword(true);
    setPasswordMessage(null);

    // Validate password requirements
    const { requirements, allMet } = validatePassword(newPassword);

    if (!allMet) {
      const missing = [];
      if (!requirements.length) missing.push("at least 8 characters");
      if (!requirements.uppercase) missing.push("one uppercase letter");
      if (!requirements.lowercase) missing.push("one lowercase letter");
      if (!requirements.number) missing.push("one number");
      if (!requirements.special) missing.push("one special character");

      setPasswordMessage({
        type: "error",
        text: `Password must contain ${missing.join(", ")}`
      });
      setIsUpdatingPassword(false);
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match" });
      setIsUpdatingPassword(false);
      return;
    }

    try {
      const response = await fetch("/api/user/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: currentPassword || undefined,
          newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordMessage({ type: "success", text: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPasswordMessage({ type: "error", text: data.error || "Failed to update password" });
      }
    } catch (error) {
      setPasswordMessage({ type: "error", text: "An error occurred" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-body text-neutral-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="text-body-sm">Back</span>
              </button>
              <h1 className="text-h4 text-neutral-900">Settings</h1>
            </div>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {/* Profile Information */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h2 className="text-h5 text-neutral-900 mb-6">Profile Information</h2>

            <form onSubmit={handleUpdateName} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-neutral-700 mb-2">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isUpdatingName}
                  className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-neutral-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={session.user?.email || ""}
                  disabled
                  className="w-full px-4 py-3 border border-neutral-300 rounded-md bg-neutral-50 text-neutral-500"
                />
                <p className="text-caption text-neutral-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              {nameMessage && (
                <div
                  className={`p-4 rounded-md border ${
                    nameMessage.type === "success"
                      ? "bg-success-50 border-success-200 text-success-800"
                      : "bg-error-50 border-error-200 text-error-800"
                  } text-sm`}
                >
                  <div className="flex gap-2">
                    {nameMessage.type === "success" ? (
                      <svg className="w-5 h-5 text-success-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-error-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{nameMessage.text}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingName || !name}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingName ? "Updating..." : "Update Name"}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="bg-white rounded-lg border border-neutral-200 p-6 shadow-sm">
            <h2 className="text-h5 text-neutral-900 mb-2">Password</h2>
            <p className="text-body-sm text-neutral-600 mb-6">
              Set or change your password for signing in with email and password.
            </p>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label htmlFor="currentPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                  Current Password (if set)
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isUpdatingPassword}
                  placeholder="Leave blank if not set"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => setShowPasswordRequirements(true)}
                  onBlur={() => {
                    // Keep showing if there's text in the field
                    if (!newPassword) setShowPasswordRequirements(false);
                  }}
                  required
                  disabled={isUpdatingPassword}
                  placeholder="Enter a strong password"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                />

                {/* Password Requirements */}
                {showPasswordRequirements && (
                  <div className="mt-3 p-3 bg-neutral-50 rounded-md border border-neutral-200">
                    <p className="text-xs font-medium text-neutral-700 mb-2">Password must contain:</p>
                    <ul className="space-y-1">
                      {[
                        { key: 'length', label: 'At least 8 characters', test: newPassword.length >= 8 },
                        { key: 'uppercase', label: 'One uppercase letter (A-Z)', test: /[A-Z]/.test(newPassword) },
                        { key: 'lowercase', label: 'One lowercase letter (a-z)', test: /[a-z]/.test(newPassword) },
                        { key: 'number', label: 'One number (0-9)', test: /[0-9]/.test(newPassword) },
                        { key: 'special', label: 'One special character (!@#$%...)', test: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) }
                      ].map(req => (
                        <li key={req.key} className="flex items-center gap-2 text-xs">
                          {req.test ? (
                            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className={req.test ? "text-green-700" : "text-neutral-600"}>
                            {req.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral-700 mb-2">
                  Confirm New Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isUpdatingPassword}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-neutral-50 disabled:text-neutral-500 text-neutral-900"
                />
              </div>

              {passwordMessage && (
                <div
                  className={`p-4 rounded-md border ${
                    passwordMessage.type === "success"
                      ? "bg-success-50 border-success-200 text-success-800"
                      : "bg-error-50 border-error-200 text-error-800"
                  } text-sm`}
                >
                  <div className="flex gap-2">
                    {passwordMessage.type === "success" ? (
                      <svg className="w-5 h-5 text-success-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-error-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    <span>{passwordMessage.text}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword || !confirmPassword}
                className="w-full bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
