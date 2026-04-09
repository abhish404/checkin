import { Stack } from "expo-router";
import { useTheme } from "@/context/ThemeContext";

export default function ProfileLayout() {
    const { colors } = useTheme();

    return (
        <Stack
            screenOptions={{
                headerShown: false, // We have custom headers in screens
                contentStyle: { backgroundColor: colors.background || '#121212' }, // Enforce dark background
                animation: 'slide_from_right',
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="[publicId]" />
            <Stack.Screen name="edit" />
            <Stack.Screen name="privacy" />
            <Stack.Screen name="security" />
            <Stack.Screen name="preferences" />
        </Stack>
    );
}
