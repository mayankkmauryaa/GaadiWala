import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, StatusBar, Switch, Alert, Image, ActivityIndicator } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, runTransaction, increment } from 'firebase/firestore';
import { RideRequest, RideStatus, UserRole } from '../../types';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

export default function DriverDashboard() {
    const router = useRouter();
    const { user } = useAuth();
    const mapRef = useRef<MapView>(null);

    // State
    const [isOnline, setIsOnline] = useState(user?.isOnline || false);
    const [incomingRide, setIncomingRide] = useState<RideRequest | null>(null);
    const [activeTrip, setActiveTrip] = useState<RideRequest | null>(null);
    const [dailyEarnings, setDailyEarnings] = useState(0);
    const [completedRidesToday, setCompletedRidesToday] = useState(0);
    const [location, setLocation] = useState<Location.LocationObject | null>(null);

    useEffect(() => {
        if (user?.role !== UserRole.DRIVER) {
            Alert.alert("Access Denied", "You are not a driver.");
            router.replace('/user/home');
        }
    }, [user]);

    // Location Tracking
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;

        const startTracking = async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setIsOnline(false);
                return;
            }

            subscription = await Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    timeInterval: 5000,
                    distanceInterval: 10
                },
                async (loc) => {
                    setLocation(loc);
                    if (isOnline && user?.id) {
                        try {
                            await updateDoc(doc(db, 'users', user.id), {
                                currentLocation: {
                                    lat: loc.coords.latitude,
                                    lng: loc.coords.longitude
                                },
                                lastOnline: Date.now()
                            });
                        } catch (e) {
                            console.error("Loc update failed", e);
                        }
                    }
                }
            );

            // Center map initially
            if (mapRef.current && location) {
                mapRef.current.animateToRegion({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01
                });
            }
        };

        if (isOnline) {
            startTracking();
        } else {
            if (subscription) (subscription as any).remove();
        }

        return () => {
            if (subscription) (subscription as any).remove();
        };
    }, [isOnline, user?.id]);

    // Toggle Online Status
    const toggleOnline = async (val: boolean) => {
        setIsOnline(val);
        if (user?.id) {
            await updateDoc(doc(db, 'users', user.id), { isOnline: val });
        }
    };

    // Listen for Trips
    useEffect(() => {
        if (!user?.id || !isOnline) return;

        // 1. Incoming Rides (Mock logic: logic essentially same as web)
        const qPending = query(
            collection(db, 'rides'),
            where('status', '==', 'SEARCHING'),
            where('vehicleType', '==', user.vehicleType || 'BIKE')
        );

        const unsubPending = onSnapshot(qPending, (snapshot) => {
            // Simple logic: grab the first one
            // In real app, filter by distance
            if (!snapshot.empty) {
                const req = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RideRequest;
                // Exclude if already rejected locally? (Not implemented)
                setIncomingRide(req);
            } else {
                setIncomingRide(null);
            }
        });

        // 2. Active Trip
        const qActive = query(
            collection(db, 'rides'),
            where('driverId', '==', user.id),
            where('status', 'in', ['ACCEPTED', 'ARRIVED', 'STARTED'])
        );
        const unsubActive = onSnapshot(qActive, (snapshot) => {
            if (!snapshot.empty) {
                const req = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as RideRequest;
                setActiveTrip(req);
                setIncomingRide(null); // Clear incoming if we have active
            } else {
                setActiveTrip(null);
            }
        });

        return () => {
            unsubPending();
            unsubActive();
        }
    }, [user?.id, isOnline]);

    // Actions
    const acceptRide = async () => {
        if (!incomingRide || !user?.id) return;
        try {
            await updateDoc(doc(db, 'rides', incomingRide.id), {
                status: RideStatus.ACCEPTED,
                driverId: user.id,
                driverName: user.name,
                acceptedAt: serverTimestamp()
            });
            // Active trip listener will catch this
        } catch (e) {
            Alert.alert("Error", "Ride no longer available");
        }
    };

    const updateRideStatus = async (status: string) => {
        if (!activeTrip) return;
        try {
            if (status === 'COMPLETED') {
                // Transactional
                await runTransaction(db, async (transaction) => {
                    const rideRef = doc(db, 'rides', activeTrip.id);
                    const userRef = doc(db, 'users', user?.id!);

                    transaction.update(rideRef, {
                        status: 'COMPLETED',
                        completedAt: serverTimestamp()
                    });
                    transaction.update(userRef, {
                        walletBalance: increment(activeTrip.estimatedFare),
                        totalRides: increment(1)
                    });
                });
                setDailyEarnings(prev => prev + activeTrip.estimatedFare);
                setCompletedRidesToday(prev => prev + 1);
            } else {
                await updateDoc(doc(db, 'rides', activeTrip.id), {
                    status: status,
                    updatedAt: serverTimestamp()
                });
            }
        } catch (e: any) {
            Alert.alert("Error", e.message);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                showsUserLocation={true}
                initialRegion={{
                    latitude: 27.4924,
                    longitude: 77.6737,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05
                }}
            >
                {/* Markers for Pick/Drop if active */}
                {activeTrip && (
                    <>
                        <Marker coordinate={{ latitude: activeTrip.pickupLocation.lat, longitude: activeTrip.pickupLocation.lng }} pinColor="green" title="Pickup" />
                        <Marker coordinate={{ latitude: activeTrip.dropLocation.lat, longitude: activeTrip.dropLocation.lng }} pinColor="red" title="Drop" />
                    </>
                )}
            </MapView>

            {/* Top Bar: Status & Earnings */}
            <View style={styles.topBar}>
                <View style={styles.onlineToggle}>
                    <Text style={[styles.statusText, { color: isOnline ? '#22c55e' : '#94a3b8' }]}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                    </Text>
                    <Switch
                        value={isOnline}
                        onValueChange={toggleOnline}
                        trackColor={{ false: "#334155", true: "#22c55e" }}
                        thumbColor="#fff"
                    />
                </View>
                <View style={styles.earningsPill}>
                    <Text style={styles.earningsLabel}>TODAY</Text>
                    <Text style={styles.earningsValue}>₹{dailyEarnings}</Text>
                </View>
            </View>

            {/* Incoming Request Card */}
            {incomingRide && !activeTrip && (
                <View style={styles.requestCard}>
                    <View style={styles.reqHeader}>
                        <View style={styles.reqBadge}><Text style={styles.reqBadgeText}>NEW REQUEST</Text></View>
                        <Text style={styles.reqPrice}>₹{incomingRide.estimatedFare}</Text>
                    </View>
                    <Text style={styles.reqTitle}>{incomingRide.vehicleType} RIDE</Text>
                    <View style={styles.reqRow}>
                        <MaterialIcons name="my-location" size={16} color="#22c55e" />
                        <Text numberOfLines={1} style={styles.reqLoc}>{incomingRide.pickupAddress}</Text>
                    </View>
                    <View style={styles.reqRow}>
                        <MaterialIcons name="location-on" size={16} color="#ea580c" />
                        <Text numberOfLines={1} style={styles.reqLoc}>{incomingRide.dropAddress}</Text>
                    </View>
                    <TouchableOpacity style={styles.acceptBtn} onPress={acceptRide}>
                        <Text style={styles.acceptText}>ACCEPT RIDE</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Active Trip Panel */}
            {activeTrip && (
                <View style={styles.activeCard}>
                    <Text style={styles.activeStatus}>{activeTrip.status}</Text>
                    <View style={styles.reqRow}>
                        <MaterialIcons name="person" size={16} color="#94a3b8" />
                        <Text style={styles.riderName}>{activeTrip.riderName} ({activeTrip.riderRating}★)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                        {activeTrip.status === 'ACCEPTED' && (
                            <TouchableOpacity onPress={() => updateRideStatus('ARRIVED')} style={styles.actionBtn}>
                                <Text style={styles.actionText}>I'VE ARRIVED</Text>
                            </TouchableOpacity>
                        )}
                        {activeTrip.status === 'ARRIVED' && (
                            <TouchableOpacity onPress={() => updateRideStatus('STARTED')} style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}>
                                <Text style={styles.actionText}>START TRIP</Text>
                            </TouchableOpacity>
                        )}
                        {activeTrip.status === 'STARTED' && (
                            <TouchableOpacity onPress={() => updateRideStatus('COMPLETED')} style={[styles.actionBtn, { backgroundColor: '#ea580c' }]}>
                                <Text style={styles.actionText}>COMPLETE RIDE</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    map: { flex: 1 },
    topBar: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    onlineToggle: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 30, paddingLeft: 16, paddingRight: 4, paddingVertical: 4, elevation: 5 },
    statusText: { fontWeight: '900', fontSize: 12, marginRight: 8, letterSpacing: 1 },
    earningsPill: { backgroundColor: '#0f172a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, alignItems: 'center', elevation: 5 },
    earningsLabel: { color: '#94a3b8', fontSize: 8, fontWeight: '900' },
    earningsValue: { color: '#22c55e', fontSize: 16, fontWeight: '900' },

    requestCard: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#0f172a', borderRadius: 24, padding: 24, elevation: 10 },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    reqBadge: { backgroundColor: '#ea580c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    reqBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    reqPrice: { color: '#fff', fontSize: 24, fontWeight: '900' },
    reqTitle: { color: '#94a3b8', fontWeight: '900', fontSize: 14, marginBottom: 16, textTransform: 'uppercase' },
    reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reqLoc: { color: '#fff', flex: 1, fontWeight: '600' },
    acceptBtn: { backgroundColor: '#22c55e', height: 50, borderRadius: 16, marginTop: 16, alignItems: 'center', justifyContent: 'center' },
    acceptText: { color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 1 },

    activeCard: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, elevation: 20 },
    activeStatus: { color: '#ea580c', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
    riderName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
    actionBtn: { flex: 1, height: 50, backgroundColor: '#3b82f6', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    actionText: { color: '#fff', fontWeight: '900', fontSize: 14 }
});
