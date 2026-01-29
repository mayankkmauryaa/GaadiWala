import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
// import { db } from '../firebase'; // Uncomment to link to backend

export const SOSButton = () => {
    const { user } = useAuth();

    const handleSOS = () => {
        Alert.alert(
            "EMERGENCY SOS",
            "Are you in danger? This will alert your emergency contacts and local authorities.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "YES, HELP!",
                    style: "destructive",
                    onPress: triggerEmergency
                }
            ]
        );
    };

    const triggerEmergency = async () => {
        // 1. Call Police (112 in India)
        Linking.openURL('tel:112');

        // 2. Notify Contacts (Mock)
        console.log("Notifying emergency contacts of user:", user?.id);

        // 3. Log to Server (Future)
        // await addDoc(collection(db, 'alerts'), { type: 'SOS', ... });
    };

    return (
        <TouchableOpacity style={styles.container} onPress={handleSOS} activeOpacity={0.7}>
            <MaterialIcons name="security" size={24} color="#fff" />
            <Text style={styles.text}>SOS</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: '#ef4444',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        elevation: 10,
        shadowColor: '#ef4444',
        shadowOpacity: 0.4,
        shadowRadius: 10,
        zIndex: 999
    },
    text: {
        color: '#fff',
        fontWeight: '900',
        letterSpacing: 1
    }
});
