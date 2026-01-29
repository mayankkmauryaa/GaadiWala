import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Alert } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { CONFIG, db } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { SOSButton } from '../../components/SOSButton';
import { AnimatedMarker } from '../../components/AnimatedMarker';
import { GlassView } from '../../components/GlassView';

const { width, height } = Dimensions.get('window');

export default function RiderHome() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const mapRef = useRef<MapView>(null);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);
    const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);

    // UI States
    const [showMenu, setShowMenu] = useState(false);

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission to access location was denied');
                return;
            }

            let loc = await Location.getCurrentPositionAsync({});
            setLocation(loc);

            if (mapRef.current && loc) {
                mapRef.current.animateToRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            }
        })();
    }, []);

    // Listen for drivers
    useEffect(() => {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'DRIVER')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            try {
                const drivers = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((d: any) => d.currentLocation && d.isOnline !== false); // Simple filter
                setNearbyDrivers(drivers);
            } catch (err) {
                console.error("Driver sync error", err);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleLogout = async () => {
        await logout();
        // Router will redirect via Index/Layout
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            {/* Map Background */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                initialRegion={{
                    latitude: 27.4924, // Mathura default
                    longitude: 77.6737,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                }}
            >
                {nearbyDrivers.map(driver => (
                    driver.currentLocation && (
                        <AnimatedMarker
                            key={driver.id}
                            driverId={driver.id}
                            coordinate={{
                                latitude: driver.currentLocation.lat,
                                longitude: driver.currentLocation.lng
                            }}
                            title={driver.name}
                        />
                    )
                ))}
            </MapView>

            <SOSButton />

            {/* Top Search Bar */}
            <GlassView style={styles.searchContainer}>
                <View style={styles.hamburger}>
                    <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
                        <MaterialIcons name="menu" size={28} color="#000" />
                    </TouchableOpacity>
                </View>

                <View style={styles.searchBox}>
                    <GooglePlacesAutocomplete
                        placeholder='Where to?'
                        onPress={(data, details = null) => {
                            // 'details' is provided when fetchDetails = true
                            console.log(data, details);
                        }}
                        query={{
                            key: CONFIG.MAPS_API_KEY,
                            language: 'en',
                            components: 'country:in',
                        }}
                        styles={{
                            textInputContainer: {
                                backgroundColor: 'transparent',
                            },
                            textInput: {
                                height: 44,
                                color: '#000',
                                fontSize: 16,
                                backgroundColor: '#f3f4f6',
                                borderRadius: 12,
                            },
                            listView: {
                                position: 'absolute',
                                top: 50,
                                left: 0,
                                right: 0,
                                backgroundColor: 'white',
                                borderRadius: 5,
                                elevation: 5,
                                zIndex: 1000
                            }
                        }}
                        enablePoweredByContainer={false}
                    />
                </View>
            </GlassView>

            {/* Menu Dropdown */}
            {
                showMenu && (
                    <View style={styles.menu}>
                        <Text style={styles.menuTitle}>GaadiWala</Text>
                        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Profile", "Coming soon")}>
                            <MaterialIcons name="person" size={24} color="#666" />
                            <Text style={styles.menuText}>Profile</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert("Trips", "Coming soon")}>
                            <MaterialIcons name="history" size={24} color="#666" />
                            <Text style={styles.menuText}>My Trips</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
                            <MaterialIcons name="logout" size={24} color="#ef4444" />
                            <Text style={[styles.menuText, { color: '#ef4444' }]}>Logout</Text>
                        </TouchableOpacity>
                    </View>
                )
            }

            {/* Bottom Panel (Simulated) */}
            <View style={styles.bottomPanel}>
                <Text style={styles.panelTitle}>Plan a ride</Text>
                <View style={styles.categoryRow}>
                    {['Bike', 'Auto', 'Car', 'Tiffin'].map((cat, i) => (
                        <TouchableOpacity
                            key={cat}
                            style={styles.categoryItem}
                            onPress={() => {
                                if (cat === 'Tiffin') {
                                    router.push('/user/tiffin');
                                } else {
                                    // Handle ride selection normally
                                }
                            }}
                        >
                            <View style={[styles.catIcon, { backgroundColor: cat === 'Tiffin' ? '#fde047' : (i === 1 ? '#ea580c' : '#f3f4f6') }]}>
                                <MaterialIcons
                                    name={(cat === 'Tiffin' ? "restaurant" : "directions_car") as any}
                                    size={24}
                                    color={cat === 'Tiffin' ? '#000' : (i === 1 ? '#fff' : '#666')}
                                />
                            </View>
                            <Text style={styles.catText}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    map: {
        width: width,
        height: height,
    },
    searchContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'flex-start',
        zIndex: 100
    },
    hamburger: {
        width: 50,
        height: 44,
        backgroundColor: '#fff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5
    },
    searchBox: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        padding: 0
    },
    menu: {
        position: 'absolute',
        top: 110,
        left: 20,
        width: 200,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 10,
        zIndex: 200
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: '#f3f4f6'
    },
    menuText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333'
    },
    bottomPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10
    },
    panelTitle: {
        fontSize: 18,
        fontWeight: '900',
        marginBottom: 16,
        color: '#0f172a'
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    categoryItem: {
        alignItems: 'center',
        gap: 8
    },
    catIcon: {
        width: 60,
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center'
    },
    catText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#64748b'
    }
});
