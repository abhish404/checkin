import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

export type StoredUser = {
  userId?: string;
  name?: string;
  email?: string;
  publicId?: string;
};

export const useUser = () => {
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setUser({
            userId: parsed.userId || parsed.id,
            name: parsed.name || parsed.email?.split("@")[0] || "User",
            email: parsed.email,
            publicId: parsed.publicId,
          });
        }
      } catch {
        setUser(null);
      }
    };
    loadUser();
  }, []);

  return user;
};
