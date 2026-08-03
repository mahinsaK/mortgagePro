"use client";

import { createContext, useContext } from "react";

const NotificationOwnerContext = createContext("");

export function NotificationOwnerProvider({
  children,
  ownerKey,
}: {
  children: React.ReactNode;
  ownerKey: string;
}) {
  return (
    <NotificationOwnerContext.Provider value={ownerKey}>
      {children}
    </NotificationOwnerContext.Provider>
  );
}

export function useNotificationOwnerKey() {
  const ownerKey = useContext(NotificationOwnerContext);

  if (!ownerKey) {
    throw new Error("Notification owner context is unavailable.");
  }

  return ownerKey;
}
