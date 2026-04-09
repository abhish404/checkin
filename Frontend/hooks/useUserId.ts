import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const USER_ID_KEY = "userId";

export const useUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadUserId = async () => {
      let storedUserId = await AsyncStorage.getItem(USER_ID_KEY);

      if (!storedUserId) {
        // Try to get from authenticated user object
        const userStr = await AsyncStorage.getItem("user");
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            storedUserId = user.userId || user.id || user._id || user.googleId;
            if (storedUserId) {
              await AsyncStorage.setItem(USER_ID_KEY, storedUserId);
            }
          } catch (e) {
            console.error("Failed to parse user from storage", e);
          }
        }
      }

      if (!storedUserId) {
        storedUserId = `user-${Date.now()}`;
        await AsyncStorage.setItem(USER_ID_KEY, storedUserId);
      }

      console.log("useUserId resolved:", storedUserId);
      setUserId(storedUserId);
    };

    loadUserId();
  }, []);

  return userId;
};
