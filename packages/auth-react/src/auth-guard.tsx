"use client";

import { type ReactNode } from "react";
// import { useAuth } from "./context";
import { useAuthGuard as _useAuthGuard } from "./hooks";
import type { AuthGuardNavigationAdapter } from "./types";

export function AuthGuard({
  children,
  fallback,
  redirectTo,
  navigationAdapter,
  replace,
}: {
  children: ReactNode;
  fallback?: ReactNode;
  redirectTo?: string;
  navigationAdapter?: AuthGuardNavigationAdapter;
  replace?: boolean;
}) {
  const { isLoading, isAuthenticated } = _useAuthGuard({ redirectTo, navigationAdapter, replace });

  if (isLoading) return fallback ?? null;
  if (!isAuthenticated) return null;

  return <>{children}</>;
}
