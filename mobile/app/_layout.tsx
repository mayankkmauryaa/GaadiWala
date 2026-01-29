import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';

export default function Layout() {
    return (
        <AuthProvider>
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="welcome" />
            </Stack>
            <StatusBar style="auto" />
        </AuthProvider>
    );
}
