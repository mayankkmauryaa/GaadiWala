import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Modal, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TiffinVendor } from '../../types';
import Animated, { FadeInDown, FadeOutDown, SlideInRight, SlideOutRight } from 'react-native-reanimated';
import { GlassView } from '../../components/GlassView';

const { width } = Dimensions.get('window');

const MOCK_VENDORS: TiffinVendor[] = [
    {
        id: 'v1',
        name: 'Gopal Tiffins',
        description: 'Traditional home-cooked Maharaja thalis with fresh parathas.',
        rating: 4.8,
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
        location: { lat: 27.4924, lng: 77.6737 },
        pureVeg: true,
        basePrice: 120,
        menus: [
            { id: 'm1', day: 'Monday', items: ['Dal Makhani', 'Paneer Butter Masala', '4 Paratha', 'Rice'] },
            { id: 'm2', day: 'Tuesday', items: ['Mix Veg', 'Rajma', '4 Roti', 'Rice'] }
        ],
        plans: [
            { id: 'p1', name: 'Daily', duration: 'DAILY', price: 120 },
            { id: 'p2', name: 'Weekly Pass', duration: 'WEEKLY', price: 750 },
            { id: 'p3', name: 'Monthly Sub', duration: 'MONTHLY', price: 2800 }
        ]
    },
    {
        id: 'v2',
        name: 'Maa ki Rasoi',
        description: 'Healthy and simple meals just like home. Low oil and spices.',
        rating: 4.9,
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0',
        location: { lat: 27.4950, lng: 77.6750 },
        pureVeg: true,
        basePrice: 80,
        menus: [
            { id: 'm3', day: 'Monday', items: ['Yellow Dal', 'Aloo Gobi', '4 Roti', 'Salad'] }
        ],
        plans: [
            { id: 'p4', name: 'Standard', duration: 'DAILY', price: 80 },
            { id: 'p5', name: 'Student Plan', duration: 'WEEKLY', price: 500 }
        ]
    }
];

export default function TiffinMarketplaceScreen() {
    const router = useRouter();
    const [selectedVendor, setSelectedVendor] = useState<TiffinVendor | null>(null);
    const [activePlan, setActivePlan] = useState<string | null>(null);

    const renderVendorModal = () => (
        <Modal animationType="slide" transparent={true} visible={!!selectedVendor} onRequestClose={() => setSelectedVendor(null)}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    {selectedVendor && (
                        <>
                            <View style={styles.modalHeader}>
                                <Image source={{ uri: selectedVendor.image }} style={styles.modalImage} />
                                <LinearGradient colors={['transparent', '#1e293b']} style={styles.modalGradient} />
                                <TouchableOpacity onPress={() => setSelectedVendor(null)} style={styles.closeButton}>
                                    <MaterialIcons name="close" size={24} color="#fff" />
                                </TouchableOpacity>
                                {selectedVendor.pureVeg && (
                                    <View style={styles.vegTag}>
                                        <Text style={styles.vegText}>PURE VEG</Text>
                                    </View>
                                )}
                            </View>

                            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.modalTitle}>{selectedVendor.name}</Text>
                                        <Text style={styles.modalDesc}>{selectedVendor.description}</Text>
                                    </View>
                                    <View style={styles.ratingBadge}>
                                        <Text style={styles.ratingText}>{selectedVendor.rating}</Text>
                                        <MaterialIcons name="star" size={12} color="#000" />
                                    </View>
                                </View>

                                <View style={styles.menuSection}>
                                    <Text style={styles.sectionHeader}>TODAY'S MENU</Text>
                                    <View style={styles.menuTags}>
                                        {selectedVendor.menus[0].items.map((item, i) => (
                                            <View key={i} style={styles.menuTag}><Text style={styles.menuTagText}>{item}</Text></View>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.planSection}>
                                    <Text style={styles.sectionHeader}>CHOOSE PLAN</Text>
                                    <View style={styles.plansGrid}>
                                        {selectedVendor.plans.map(plan => (
                                            <TouchableOpacity
                                                key={plan.id}
                                                onPress={() => setActivePlan(plan.id)}
                                                style={{ flex: 1 }}
                                            >
                                                <GlassView style={[styles.planCard, activePlan === plan.id && styles.activePlanCard]}>
                                                    <Text style={[styles.planName, activePlan === plan.id && styles.activePlanText]}>{plan.name}</Text>
                                                    <Text style={[styles.planPrice, activePlan === plan.id && styles.activePlanText]}>₹{plan.price}</Text>
                                                    <Text style={[styles.planDuration, activePlan === plan.id && styles.activePlanText]}>{plan.duration}</Text>
                                                </GlassView>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </ScrollView>

                            <View style={styles.modalFooter}>
                                <TouchableOpacity
                                    disabled={!activePlan}
                                    style={[styles.subscribeButton, !activePlan && styles.disabledButton]}
                                    onPress={() => {
                                        // TODO: Implement subscription logic
                                        router.push('/user/home');
                                    }}
                                >
                                    <Text style={styles.subscribeText}>{activePlan ? 'SUBSCRIBE NOW' : 'SELECT A PLAN'}</Text>
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Modal>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>TIFFIN HUB</Text>
                    <Text style={styles.headerSubtitle}>Culinary Network</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
                    {['All Canteens', 'Pure Veg', 'North Indian', 'Healthy', 'Budget'].map((cat, i) => (
                        <TouchableOpacity key={cat} style={[styles.catChip, i === 0 && styles.activeCatChip]}>
                            <Text style={[styles.catText, i === 0 && styles.activeCatText]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.vendorList}>
                    {MOCK_VENDORS.map((vendor, index) => (
                        <Animated.View
                            key={vendor.id}
                            entering={FadeInDown.delay(index * 100).duration(500)}
                        >
                            <TouchableOpacity onPress={() => setSelectedVendor(vendor)} style={styles.vendorCard}>
                                <Image source={{ uri: vendor.image }} style={styles.cardImage} />
                                <LinearGradient colors={['transparent', '#0F172A']} style={styles.cardGradient} />
                                <View style={styles.cardContent}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                        <View>
                                            {vendor.pureVeg && <Text style={styles.vegIndicator}>PURE VEG</Text>}
                                            <Text style={styles.cardTitle}>{vendor.name}</Text>
                                        </View>
                                        <View style={styles.cardRating}>
                                            <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{vendor.rating}</Text>
                                            <MaterialIcons name="star" size={10} color="#000" />
                                        </View>
                                    </View>
                                    <Text numberOfLines={2} style={styles.cardDesc}>{vendor.description}</Text>
                                    <View style={styles.cardFooter}>
                                        <Text style={styles.priceText}>From ₹{vendor.basePrice}</Text>
                                        <Text style={styles.exploreText}>View Menu</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>
            </ScrollView>

            {renderVendorModal()}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0F172A' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 20, backgroundColor: '#0A0E12', borderBottomWidth: 1, borderBottomColor: '#1e293b' },
    backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', textAlign: 'center', fontStyle: 'italic' },
    headerSubtitle: { color: '#ea580c', fontSize: 10, fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },

    scrollContent: { paddingBottom: 40 },
    categories: { paddingHorizontal: 20, marginVertical: 20, maxHeight: 40 },
    catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1e293b', marginRight: 10, borderWidth: 1, borderColor: '#334155' },
    activeCatChip: { backgroundColor: '#ea580c', borderColor: '#ea580c' },
    catText: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
    activeCatText: { color: '#000' },

    vendorList: { paddingHorizontal: 20, gap: 20 },
    vendorCard: { height: 280, borderRadius: 30, overflow: 'hidden', backgroundColor: '#1e293b', marginBottom: 20 },
    cardImage: { width: '100%', height: '100%' },
    cardGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
    cardContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 },
    vegIndicator: { color: '#22c55e', fontSize: 10, fontWeight: '900', marginBottom: 4 },
    cardTitle: { color: '#fff', fontSize: 24, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
    cardRating: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ea580c', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
    cardDesc: { color: '#94a3b8', fontSize: 12, marginTop: 8, marginBottom: 16 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 16 },
    priceText: { color: '#fff', fontSize: 18, fontWeight: 'bold', fontStyle: 'italic' },
    exploreText: { color: '#ea580c', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },

    modalContainer: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 40, borderTopRightRadius: 40, height: '85%', overflow: 'hidden' },
    modalHeader: { height: 250, position: 'relative' },
    modalImage: { width: '100%', height: '100%' },
    modalGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 },
    closeButton: { position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    vegTag: { position: 'absolute', top: 20, left: 20, backgroundColor: 'rgba(34,197,94,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    vegText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    modalBody: { padding: 24 },
    modalTitle: { color: '#fff', fontSize: 28, fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' },
    modalDesc: { color: '#94a3b8', fontSize: 14, marginTop: 8, lineHeight: 20 },
    ratingBadge: { backgroundColor: '#ea580c', flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    ratingText: { color: '#000', fontWeight: 'bold', fontSize: 16 },

    menuSection: { marginTop: 30 },
    sectionHeader: { color: '#64748b', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    menuTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    menuTag: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    menuTagText: { color: '#e2e8f0', fontSize: 12, fontWeight: '600' },

    planSection: { marginTop: 30, marginBottom: 40 },
    plansGrid: { flexDirection: 'row', gap: 10 },
    planCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
    activePlanCard: { borderColor: '#ea580c', backgroundColor: 'rgba(234,88,12,0.1)' },
    planName: { color: '#94a3b8', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 4 },
    planPrice: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
    planDuration: { color: '#64748b', fontSize: 8, marginTop: 4 },
    activePlanText: { color: '#ea580c' },

    modalFooter: { padding: 20, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    subscribeButton: { backgroundColor: '#22c55e', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    disabledButton: { backgroundColor: '#334155', opacity: 0.5 },
    subscribeText: { color: '#000', fontSize: 14, fontWeight: '900', letterSpacing: 1 }
});
