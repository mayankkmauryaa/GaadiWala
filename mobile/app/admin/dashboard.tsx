import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.replace('/welcome');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Admin Panel</Text>
            <Text style={styles.subtitle}>Welcome, {user?.name}</Text>

            <TouchableOpacity onPress={handleLogout} style={styles.button}>
                <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 18,
        color: '#666',
        marginBottom: 30
    },
    button: {
        padding: 15,
        backgroundColor: '#333',
        borderRadius: 10
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold'
    }
});
