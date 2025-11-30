"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, LogOut } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    // Close menu on Escape key
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  if (!session?.user) return null;

  const firstName = session.user.name?.split(" ")[0] || "User";

  return (
    <div className="relative" ref={menuRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:ring-2 hover:ring-neutral-200 transition-all focus:outline-none focus:ring-2 focus:ring-neutral-400"
        aria-label="User menu"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt={session.user.name || "User"}
            className="w-10 h-10 rounded-full border-2 border-neutral-200"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium border-2 border-neutral-200">
            {firstName.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Chevron indicator */}
        <ChevronDown
          className={`h-4 w-4 text-neutral-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-neutral-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-neutral-200">
            <p className="text-body-sm font-medium text-neutral-900">
              {session.user.name}
            </p>
            <p className="text-caption text-neutral-600 truncate">
              {session.user.email}
            </p>
          </div>

          {/* Sign Out */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIsOpen(false);
                signOut();
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-body-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              <LogOut className="h-5 w-5 text-neutral-500" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
