"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export function AuthSync() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  useEffect(() => {
    console.log("AUTH STATE:", {
      isLoaded,
      isSignedIn,
      userId,
    });

    if (!isLoaded || !isSignedIn || !userId) {
      return;
    }

    const syncUser = async () => {
      try {
        console.log("SYNCING USER:", userId);

        const response = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        console.log("SYNC RESPONSE:", response.status, data);

        if (!response.ok) {
          throw new Error(
            data.error || "User sync failed",
          );
        }

        console.log("USER SAVED:", data.data);
      } catch (error) {
        console.error("AUTH SYNC ERROR:", error);
      }
    };

    syncUser();
  }, [isLoaded, isSignedIn, userId]);

  return null;
}