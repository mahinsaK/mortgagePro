"use client";

import { createContext, useContext } from "react";

type AuthContextValue = {
  user: null;
};

const AuthContext = createContext<AuthContextValue>({ user: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthContext.Provider value={{ user: null }}>{children}</AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
