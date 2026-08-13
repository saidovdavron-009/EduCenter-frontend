"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser, UserRole } from "@/types";
import { setAccessTokenCookie, clearAccessTokenCookie } from "@/lib/api";

interface ProfileResponse {
  fullName?: string | null;
  avatarUrl?: string | null;
  profile?: { id: string; fullName: string; avatarUrl?: string } | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  hydrateProfile: (profileData: ProfileResponse) => void;
  logout: () => void;
  hasRole: (role: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);
        }
        setAccessTokenCookie(accessToken);
        set({ user, accessToken, refreshToken, isAuthenticated: true });
      },

      setUser: (user) => set({ user }),

      // ADMIN accounts have no Student/Teacher/Parent row, so the backend never
      // returns a nested `profile` for them — their name lives on the User entity
      // itself (top-level `fullName`). Fall back to that so admins see their name
      // instead of their login ID in the header/sidebar.
      hydrateProfile: (profileData) => {
        const { user } = get();
        if (!user) return;
        const fullName = profileData.profile?.fullName || profileData.fullName;
        if (!fullName) return;
        set({
          user: {
            ...user,
            profile: {
              id: profileData.profile?.id || user.id,
              fullName,
              avatarUrl: profileData.profile?.avatarUrl || profileData.avatarUrl || undefined,
            },
          },
        });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
        clearAccessTokenCookie();
        set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },

      hasRole: (role) => {
        const { user } = get();
        if (!user) return false;
        if (Array.isArray(role)) return role.includes(user.role);
        return user.role === role;
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
