import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, Dimensions, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

export default function Welcome() {
    const router = useRouter();
    const { login, signup, user, loading, signInWithGoogle } = useAuth();

    // Google Auth Configuration
    // TODO: Add your Client IDs in .env or app.json
    const [request, response, promptAsync] = Google.useAuthRequest({
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { id_token } = response.params;
            if (id_token) {
                signInWithGoogle(id_token)
                    .catch(err => Alert.alert("Google Sign In Failed", err.message));
            }
        }
    }, [response]);

    const [activeTab, setActiveTab] = useState<'RIDE' | 'DRIVE'>('RIDE');
    const [isSignup, setIsSignup] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [phone, setPhone] = useState('');
    const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
    const [isBusy, setIsBusy] = useState(false);

    useEffect(() => {
        if (user && !loading && user.role !== UserRole.UNSET) {
            if (user.role === UserRole.DRIVER) router.replace('/driver/dashboard');
            else if (user.role === UserRole.ADMIN) router.replace('/admin/dashboard');
            else router.replace('/user/home');
        }
    }, [user, loading]);

    const handleAuth = async () => {
        if (isSignup && (!name || !gender || !phone)) {
            Alert.alert("Missing Details", "Please fill all details.");
            return;
        }
        setIsBusy(true);
        try {
            if (isSignup) {
                await signup(email, password, phone, name);
                router.replace('/user/home'); // Or handle role accordingly
            } else {
                await login(email, password);
                // Redirect handled by useEffect
            }
        } catch (error: any) {
            Alert.alert("Authentication Failed", error.message);
        } finally {
            setIsBusy(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#0A0E12' }}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={{ flexGrow: 1 }}>

                {/* Hero Backgound */}
                <View style={{ height: height * 0.45, position: 'relative' }}>
                    <Image
                        source={{ uri: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=1000&auto=format&fit=crop' }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={['transparent', '#0A0E12']}
                        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
                    />
                    <View style={{ position: 'absolute', top: 60, left: 20 }}>
                        <Text style={{ fontSize: 32, fontWeight: '900', color: '#444040ff', letterSpacing: -1, textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 1, textAlign: 'center' }}>
                            GAADIWALA
                        </Text>
                    </View>
                </View>

                {/* Auth Card */}
                <View style={{ marginTop: -40, marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 24, padding: 24, paddingBottom: 40, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }}>

                    {/* Tabs */}
                    <View style={{ flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 16, padding: 4, marginBottom: 24 }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('RIDE')}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: activeTab === 'RIDE' ? '#fff' : 'transparent', alignItems: 'center', shadowColor: '#000', shadowOpacity: activeTab === 'RIDE' ? 0.05 : 0 }}
                        >
                            <Text style={{ fontWeight: '900', fontSize: 12, color: activeTab === 'RIDE' ? '#ea580c' : '#94a3b8', letterSpacing: 1 }}>RIDE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('DRIVE')}
                            style={{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: activeTab === 'DRIVE' ? '#fff' : 'transparent', alignItems: 'center', shadowColor: '#000', shadowOpacity: activeTab === 'DRIVE' ? 0.05 : 0 }}
                        >
                            <Text style={{ fontWeight: '900', fontSize: 12, color: activeTab === 'DRIVE' ? '#0d9488' : '#94a3b8', letterSpacing: 1 }}>DRIVE</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={{ fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8, letterSpacing: -0.5 }}>
                        {activeTab === 'RIDE' ? 'Book your next adventure' : 'Join the fleet, start earning'}
                    </Text>
                    <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>
                        {isSignup ? 'Create an account to get started.' : 'Welcome back! Sign in to continue.'}
                    </Text>

                    <View style={{ gap: 16 }}>
                        {isSignup && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                <MaterialIcons name="person" size={20} color="#94a3b8" />
                                <TextInput
                                    placeholder="Full Legal Name"
                                    style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: '#0f172a' }}
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <MaterialIcons name="mail" size={20} color="#94a3b8" />
                            <TextInput
                                placeholder="Email Address"
                                autoCapitalize="none"
                                keyboardType="email-address"
                                style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: '#0f172a' }}
                                value={email}
                                onChangeText={setEmail}
                            />
                        </View>

                        {/* Phone & Gender for Signup */}
                        {isSignup && (
                            <>
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e2e8f0' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 10, borderRightWidth: 1, borderRightColor: '#cbd5e1', marginRight: 10 }}>
                                        <Text style={{ fontWeight: 'bold', color: '#64748b' }}>+91</Text>
                                    </View>
                                    <TextInput
                                        placeholder="Mobile Number"
                                        keyboardType="phone-pad"
                                        maxLength={10}
                                        style={{ flex: 1, fontWeight: '600', color: '#0f172a' }}
                                        value={phone}
                                        onChangeText={setPhone}
                                    />
                                </View>
                                <View style={{ flexDirection: 'row', gap: 12 }}>
                                    <TouchableOpacity onPress={() => setGender('MALE')} style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: gender === 'MALE' ? '#3b82f6' : '#f1f5f9', backgroundColor: gender === 'MALE' ? '#eff6ff' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', color: gender === 'MALE' ? '#1d4ed8' : '#94a3b8', fontSize: 12 }}>MALE</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setGender('FEMALE')} style={{ flex: 1, height: 48, borderRadius: 12, borderWidth: 2, borderColor: gender === 'FEMALE' ? '#ec4899' : '#f1f5f9', backgroundColor: gender === 'FEMALE' ? '#fdf2f8' : '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
                                        <Text style={{ fontWeight: 'bold', color: gender === 'FEMALE' ? '#be185d' : '#94a3b8', fontSize: 12 }}>FEMALE</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 12, paddingHorizontal: 16, height: 56, borderWidth: 1, borderColor: '#e2e8f0' }}>
                            <MaterialIcons name="lock" size={20} color="#94a3b8" />
                            <TextInput
                                placeholder="Password"
                                secureTextEntry
                                style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: '#0f172a' }}
                                value={password}
                                onChangeText={setPassword}
                            />
                        </View>

                        <TouchableOpacity
                            onPress={handleAuth}
                            style={{ height: 56, backgroundColor: '#000', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 8 }}
                        >
                            <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1 }}>
                                {isBusy ? 'PLEASE WAIT...' : (isSignup ? 'CREATE ACCOUNT' : 'SIGN IN')}
                            </Text>
                        </TouchableOpacity>

                        {/* Google Sign In Button */}
                        <TouchableOpacity
                            disabled={!request}
                            onPress={() => promptAsync()}
                            style={{
                                height: 56,
                                backgroundColor: '#fff',
                                borderRadius: 12,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: 12,
                                borderWidth: 1,
                                borderColor: '#e2e8f0',
                                flexDirection: 'row',
                                gap: 12
                            }}
                        >
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/300/300221.png' }}
                                style={{ width: 24, height: 24 }}
                            />
                            <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 14 }}>
                                Continue with Google
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsSignup(!isSignup)} style={{ alignItems: 'center', padding: 8 }}>
                            <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold' }}>
                                {isSignup ? 'Already have an account? Sign In' : 'New here? Create an Account'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Footer Info */}
                <View style={{ padding: 24, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', opacity: 0.5, fontSize: 10, letterSpacing: 2, fontWeight: '900', textTransform: 'uppercase' }}>
                        Trusted by 10M+ users
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}
