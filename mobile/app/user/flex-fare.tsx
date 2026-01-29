import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRide, FareEstimate } from '../../hooks/useRide';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '@expo/vector-icons';
import { VehicleCategory, RideType, RidePreferences, Coordinates, PaymentMethod } from '../../types';
import * as Location from 'expo-location';
import Animated, { FadeInDown, FadeOutDown, SlideInRight, SlideOutRight, FadeIn, FadeOut } from 'react-native-reanimated';
import { GlassView } from '../../components/GlassView';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface Driver {
    id: string;
    name: string;
    avatar: string;
    carModel: string;
    carNumber: string;
    rating: number;
    price: number;
    eta: string;
    conditions: string[];
    currentLocation?: Coordinates;
}

export default function FlexFareScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { user } = useAuth();
    const { getFareEstimate, getAvailableDrivers, requestRide, activeRide, scheduleRide } = useRide();

    // Parse params (they come as strings)
    const pickup = params.pickup as string || 'Current Location';
    const destination = params.destination as string || 'Destination';
    const pickupCoords = params.pickupCoords ? JSON.parse(params.pickupCoords as string) : null;
    const dropCoords = params.dropCoords ? JSON.parse(params.dropCoords as string) : null;
    const initialCategory = (params.category as VehicleCategory) || VehicleCategory.MINI;
    const rideType = (params.rideType as RideType) || 'RESERVED';

    // State
    const [step, setStep] = useState<'BIDDING' | 'DRIVERS' | 'PAYMENT' | 'WAITING'>('BIDDING');
    const [bid, setBid] = useState(250);
    const [initialFare, setInitialFare] = useState(250);
    const [passengerCount, setPassengerCount] = useState(1);
    const [preferences, setPreferences] = useState<RidePreferences>({ silent: false, ac: false, music: false });
    const [availableDrivers, setAvailableDrivers] = useState<Driver[]>([]);
    const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
    const [loading, setLoading] = useState(false);
    const [loadingDrivers, setLoadingDrivers] = useState(false);

    const mapRef = useRef<MapView>(null);

    useEffect(() => {
        // Initial Fare Calculation
        const init = async () => {
            if (params.initialFare) {
                const fare = Number(params.initialFare);
                setInitialFare(fare);
                setBid(fare);
            } else if (pickupCoords && dropCoords) {
                setLoading(true);
                try {
                    const estimates = await getFareEstimate(pickupCoords, dropCoords);
                    const est = estimates.find(e => e.category === initialCategory);
                    const fare = est ? Math.round(est.amount) : 250;
                    setInitialFare(fare);
                    setBid(fare);
                } catch (e) {
                    console.error("Fare calc error", e);
                } finally {
                    setLoading(false);
                }
            }
        };
        init();
    }, []);

    useEffect(() => {
        if (pickupCoords && dropCoords && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates([
                    { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
                    { latitude: dropCoords.lat, longitude: dropCoords.lng }
                ], {
                    edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
                    animated: true
                });
            }, 500);
        }
    }, [pickupCoords, dropCoords]);

    const handleFindDrivers = async () => {
        setLoadingDrivers(true);
        try {
            const drivers = await getAvailableDrivers(initialCategory, user?.gender);
            // Enrich with mock pricing logic based on bid logic from Web
            const enriched = drivers.map((d: any) => ({
                ...d,
                price: bid, // Simplify for finding partners near bid
                currentLocation: d.currentLocation || (pickupCoords ? {
                    lat: pickupCoords.lat + (Math.random() - 0.5) * 0.01,
                    lng: pickupCoords.lng + (Math.random() - 0.5) * 0.01
                } : undefined)
            }));
            setAvailableDrivers(enriched);
            setStep('DRIVERS');
        } catch (error) {
            Alert.alert("Error", "Could not find drivers.");
        } finally {
            setLoadingDrivers(false);
        }
    };

    const handleBook = async () => {
        if (!pickupCoords || !dropCoords) return;
        setLoading(true);
        try {
            await requestRide(
                pickupCoords,
                dropCoords,
                pickup,
                destination,
                initialCategory,
                selectedDriver?.price || bid,
                selectedDriver?.id,
                paymentMethod,
                preferences
            );
            setStep('WAITING');
        } catch (error: any) {
            Alert.alert("Booking Failed", error.message);
        } finally {
            setLoading(false);
        }
    };

    const renderBidding = () => (
        <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOutDown.duration(300)} style={styles.sheetContent}>
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>Make Your Offer</Text>
                <View style={styles.passengers}>
                    <TouchableOpacity onPress={() => passengerCount > 1 && setPassengerCount(c => c - 1)} style={styles.iconButton}>
                        <MaterialIcons name="remove" size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.passengerText}>{passengerCount}</Text>
                    <TouchableOpacity onPress={() => passengerCount < 4 && setPassengerCount(c => c + 1)} style={styles.iconButton}>
                        <MaterialIcons name="add" size={20} color="#fff" />
                    </TouchableOpacity>
                    <MaterialIcons name="person" size={16} color="#94a3b8" style={{ marginLeft: 4 }} />
                </View>
            </View>

            <View style={styles.bidContainer}>
                <Text style={styles.currency}>₹</Text>
                <TextInput
                    style={styles.bidInput}
                    value={bid.toString()}
                    keyboardType="number-pad"
                    onChangeText={(t) => setBid(Number(t))}
                />
            </View>

            <View style={styles.quickBidRow}>
                {[initialFare * 0.9, initialFare, initialFare * 1.1, initialFare * 1.25].map((val, i) => {
                    const rounded = Math.round(val);
                    return (
                        <TouchableOpacity key={i} onPress={() => setBid(rounded)} style={[styles.quickBidBtn, bid === rounded && styles.activeBidBtn]}>
                            <Text style={[styles.quickBidText, bid === rounded && styles.activeBidText]}>₹{rounded}</Text>
                        </TouchableOpacity>
                    )
                })}
            </View>

            <View style={styles.prefsRow}>
                {[
                    { label: 'Silent', key: 'silent', icon: 'volume-off' },
                    { label: 'AC', key: 'ac', icon: 'ac-unit' },
                    { label: 'Music', key: 'music', icon: 'music-note' }
                ].map((p: any) => (
                    <TouchableOpacity
                        key={p.key}
                        style={[styles.prefChip, (preferences as any)[p.key] && styles.activePref]}
                        onPress={() => setPreferences(prev => ({ ...prev, [p.key]: !prev[p.key as keyof RidePreferences] }))}
                    >
                        <MaterialIcons name={p.icon} size={16} color={(preferences as any)[p.key] ? "#000" : "#94a3b8"} />
                        <Text style={[(preferences as any)[p.key] ? styles.activePrefText : styles.prefText]}>{p.label}</Text>
                    </TouchableOpacity>
                ))}

            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
                <TouchableOpacity onPress={handleFindDrivers} style={styles.actionButton}>
                    {loadingDrivers ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Find Drivers</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setStep('PAYMENT'); setSelectedDriver(null) }} style={[styles.actionButton, { backgroundColor: '#ea580c' }]}>
                    <Text style={styles.actionBtnText}>Book Direct (₹{bid})</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    const renderDrivers = () => (
        <Animated.View entering={SlideInRight.duration(400)} exiting={SlideOutRight.duration(300)} style={[styles.sheetContent, { maxHeight: height * 0.6 }]}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setStep('BIDDING')}><MaterialIcons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.sectionTitle}>Available Drivers</Text>
                <View style={{ width: 24 }} />
            </View>
            <ScrollView style={{ marginTop: 15 }} showsVerticalScrollIndicator={false}>
                {availableDrivers.map(driver => (
                    <TouchableOpacity key={driver.id} onPress={() => { setSelectedDriver(driver); setStep('PAYMENT'); }}>
                        <GlassView style={styles.driverCard}>
                            <Image source={{ uri: driver.avatar }} style={styles.driverAvatar} />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.driverName}>{driver.name}</Text>
                                <Text style={styles.driverCar}>{driver.carModel} • <Text style={{ color: '#22c55e' }}>{driver.rating} ★</Text></Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.driverPrice}>₹{driver.price}</Text>
                                <Text style={styles.driverEta}>{driver.eta}</Text>
                            </View>
                        </GlassView>
                    </TouchableOpacity>
                ))}
                {availableDrivers.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: '#64748b' }}>No active drivers found nearby.</Text>
                    </View>
                )}
            </ScrollView>
        </Animated.View>
    );

    const renderPayment = () => (
        <View style={styles.sheetContent}>
            <View style={styles.headerRow}>
                <TouchableOpacity onPress={() => setStep(selectedDriver ? 'DRIVERS' : 'BIDDING')}><MaterialIcons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
                <Text style={styles.sectionTitle}>Confirm Booking</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.confirmCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
                    <View style={styles.locIcon}><MaterialIcons name="my-location" size={16} color="#22c55e" /></View>
                    <Text numberOfLines={1} style={styles.locText}>{pickup}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={[styles.locIcon, { backgroundColor: '#ea580c10' }]}><MaterialIcons name="location-on" size={16} color="#ea580c" /></View>
                    <Text numberOfLines={1} style={styles.locText}>{destination}</Text>
                </View>
            </View>

            <View style={{ marginVertical: 20 }}>
                <Text style={styles.label}>Payment Method</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    {['CASH', 'UPI', 'WALLET'].map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.payMethod, paymentMethod === m && styles.activePayMethod]}
                            onPress={() => setPaymentMethod(m as PaymentMethod)}
                        >
                            <Text style={[styles.payText, paymentMethod === m && styles.activePayText]}>{m}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <TouchableOpacity onPress={handleBook} style={[styles.actionButton, { marginTop: 10 }]}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.actionBtnText}>Confirm Request ₹{selectedDriver?.price || bid}</Text>}
            </TouchableOpacity>
        </View>
    );

    const renderWaiting = () => (
        <View style={[styles.sheetContent, { alignItems: 'center', justifyContent: 'center', height: 300 }]}>
            <ActivityIndicator size="large" color="#ea580c" />
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Searching for Captains...</Text>
            <Text style={{ color: '#94a3b8', textAlign: 'center', marginTop: 10 }}>
                We assume {selectedDriver ? `${selectedDriver.name}` : `nearby drivers`} will accept your offer of ₹{selectedDriver?.price || bid}.
            </Text>
            <TouchableOpacity onPress={() => {
                if (activeRide) {
                    // cancelRide(activeRide.id); // Not implemented here correctly yet
                }
                setStep('BIDDING');
            }} style={{ marginTop: 30 }}>
                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>Cancel Request</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    provider={PROVIDER_GOOGLE}
                    initialRegion={pickupCoords ? {
                        latitude: pickupCoords.lat,
                        longitude: pickupCoords.lng,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05
                    } : undefined}
                >
                    {pickupCoords && <Marker coordinate={{ latitude: pickupCoords.lat, longitude: pickupCoords.lng }} title="Pickup" pinColor="green" />}
                    {dropCoords && <Marker coordinate={{ latitude: dropCoords.lat, longitude: dropCoords.lng }} title="Drop" pinColor="orange" />}
                    {pickupCoords && dropCoords && (
                        <Polyline
                            coordinates={[
                                { latitude: pickupCoords.lat, longitude: pickupCoords.lng },
                                { latitude: dropCoords.lat, longitude: dropCoords.lng }
                            ]}
                            strokeWidth={3}
                            strokeColor="#ea580c"
                        />
                    )}
                    {availableDrivers.map(d => d.currentLocation && (
                        <Marker
                            key={d.id}
                            coordinate={{ latitude: d.currentLocation.lat, longitude: d.currentLocation.lng }}
                            image={{ uri: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png' }} // Mock car icon
                            style={{ width: 30, height: 30 }}
                        />
                    ))}
                </MapView>

                {/* Back Button Overlay */}
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <MaterialIcons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
            </View>

            <View style={styles.bottomSheet}>
                {step === 'BIDDING' && renderBidding()}
                {step === 'DRIVERS' && renderDrivers()}
                {step === 'PAYMENT' && renderPayment()}
                {step === 'WAITING' && renderWaiting()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0A0E12' },
    mapContainer: { height: height * 0.45, width: '100%' },
    map: { flex: 1 },
    backBtn: { position: 'absolute', top: 40, left: 20, width: 40, height: 40, backgroundColor: '#fff', borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 5 },
    bottomSheet: {
        flex: 1,
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        marginTop: -30,
        paddingTop: 10,
        overflow: 'hidden'
    },
    sheetContent: { padding: 24, paddingBottom: 40 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', letterSpacing: 1 },
    passengers: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', borderRadius: 20, padding: 4 },
    iconButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#475569', justifyContent: 'center', alignItems: 'center' },
    passengerText: { color: '#fff', fontWeight: 'bold', marginHorizontal: 10 },

    bidContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
    currency: { fontSize: 32, color: '#22c55e', fontWeight: '900' },
    bidInput: { fontSize: 48, color: '#fff', fontWeight: '900', textAlign: 'center', minWidth: 100 },

    quickBidRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    quickBidBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
    activeBidBtn: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    quickBidText: { color: '#94a3b8', fontWeight: 'bold' },
    activeBidText: { color: '#000' },

    prefsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    prefChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: '#334155', borderWidth: 1, borderColor: '#475569' },
    activePref: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
    prefText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    activePrefText: { color: '#000', fontSize: 12, fontWeight: 'bold' },

    actionButton: { flex: 1, height: 56, backgroundColor: '#22c55e', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    actionBtnText: { color: '#000', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },

    driverCard: { flexDirection: 'row', padding: 16, backgroundColor: '#334155', borderRadius: 16, marginBottom: 10, alignItems: 'center' },
    driverAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#475569' },
    driverName: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    driverCar: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    driverPrice: { color: '#22c55e', fontWeight: '900', fontSize: 18 },
    driverEta: { color: '#fff', fontSize: 10, opacity: 0.6 },

    confirmCard: { backgroundColor: '#334155', padding: 20, borderRadius: 20 },
    locIcon: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#22c55e20', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    locText: { color: '#fff', fontWeight: '600', flex: 1 },
    label: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    payMethod: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#475569', alignItems: 'center' },
    activePayMethod: { borderColor: '#22c55e', backgroundColor: '#22c55e10' },
    payText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 10 },
    activePayText: { color: '#22c55e' }
});;
