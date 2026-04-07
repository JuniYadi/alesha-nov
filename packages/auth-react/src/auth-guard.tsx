"use client";

import { type ReactNode } from "react";
// import { useAuth } from "./context";
import { useAuthGuard as _useAuthGuard } from "./hooks";

export function AuthGuard({
  children,
  fallback,
  redirectTo,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
}) {
  const { isLoading, isAuthenticated } = _useAuthGuard({ redirectTo });

  if (isLoading) return fallback ?? null;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
