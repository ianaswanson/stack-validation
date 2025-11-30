"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { ReactNode } from "react";

interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Session Provider Wrapper
 *
 * Wraps the application with NextAuth SessionProvider to enable
 * useSession() hook throughout the app.
 *
 * Usage in app/layout.tsx:
 *
 * import { SessionProvider } from "@/components/session-provider";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <SessionProvider>{children}</SessionProvider>
 *       </body>
 *     </html>
 *   );
 * }
 */
export function SessionProvider({ children }: SessionProviderProps) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
