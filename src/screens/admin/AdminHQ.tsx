import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../../firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, setDoc } from 'firebase/firestore';
import { User, UserRole, Report, TiffinOrder, TiffinVendor, RideRequest, RideStatus, PromoCode } from '../../types';
import { useClickOutside } from '../../hooks/useClickOutside';

// Modular Components
import AdminSidebar from '../../components/admin/AdminSidebar';
import AdminHeader from '../../components/admin/AdminHeader';
import AdminModals from '../../components/admin/AdminModals';
import ScrollHint from '../../components/shared/ScrollHint';

// Tab Components
import OverviewTab from '../../components/admin/tabs/OverviewTab';
import FleetTab from '../../components/admin/tabs/FleetTab';
import RidersTab from '../../components/admin/tabs/RidersTab';
import LiveOpsTab from '../../components/admin/tabs/LiveOpsTab';
import TiffinTab from '../../components/admin/tabs/TiffinTab';
import SettingsTab from '../../components/admin/tabs/SettingsTab';
import BroadcastTab from '../../components/admin/tabs/BroadcastTab';
import PromotionsTab from '../../components/admin/tabs/PromotionsTab';
import ReportsTab from '../../components/admin/tabs/ReportsTab';

interface DriverUpdate {
    id: string;
    driverId: string;
    driverName: string;
    changes: Record<string, { before: any; after: any }>;
    timestamp: Date;
    status: 'PENDING' | 'REVIEWED';
    requiresReview: boolean;
}

interface Props {
    onApprove: (id: string, approved: boolean, reason?: string) => void;
}




const trafficData = [
    { time: '06:00', users: 120, drivers: 45 },
    { time: '09:00', users: 450, drivers: 180 },
    { time: '12:00', users: 380, drivers: 150 },
    { time: '15:00', users: 290, drivers: 120 },
    { time: '18:00', users: 650, drivers: 250 },
    { time: '21:00', users: 420, drivers: 160 },
];

const AdminHQ: React.FC<Props> = ({ onApprove }) => {
    const navigate = useNavigate();
    const handleLogout = async () => {
        try {
            await signOut(auth);
            navigate('/');
        } catch (err) {
            console.error("Logout failed", err);
        }
    };

    const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'users' | 'reports' | 'tiffin' | 'live' | 'settings' | 'broadcasts' | 'promotions'>('overview');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [showSidebar, setShowSidebar] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const mainScrollRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);

    useClickOutside(sidebarRef, () => setShowSidebar(false));
    useClickOutside(notificationRef, () => setShowNotifications(false));

    // Data States
    const [users, setUsers] = useState<User[]>([]);
    const [drivers, setDrivers] = useState<User[]>([]);
    const [reports, setReports] = useState<Report[]>([]);
    const [tiffinOrders, setTiffinOrders] = useState<TiffinOrder[]>([]);
    const [tiffinVendors, setTiffinVendors] = useState<TiffinVendor[]>([]);
    const [activeRides, setActiveRides] = useState<RideRequest[]>([]);
    const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
    const [driverUpdates, setDriverUpdates] = useState<DriverUpdate[]>([]);
    const [stats] = useState({ revenue: 0, totalRides: 0, tiffinRevenue: 0 });

    // State for filtering
    const [driverFilter, setDriverFilter] = useState<'ALL' | 'PENDING' | 'ACTIVE' | 'BLOCKED'>('ALL');
    const [userFilter, setUserFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');

    // Rejection & Block Logic
    const [actioningUser, setActioningUser] = useState<{ id: string, type: 'BLOCK' | 'REJECT' | 'DELETE' } | null>(null);
    const [inspectingDriver, setInspectingDriver] = useState<User | null>(null);
    const [reason, setReason] = useState('');

    // Broadcast State
    const [broadcastMsg, setBroadcastMsg] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // System Configuration State
    const [sysConfig, setSysConfig] = useState({
        baseFares: { BIKE: 10, AUTO: 15, MINI: 25, PINK: 30, PRIME: 50 },
        surgeMultiplier: 1.2,
        tiffinCommission: 12,
        pinkCabLockdown: false,
        liveSOSProtocol: true
    });
    const [isConfigSaving, setIsConfigSaving] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        // Riders Listener - Anyone who has RIDER capability
        const qUsers = query(collection(db, 'users'), where('roles', 'array-contains', UserRole.RIDER));
        const unsubUsers = onSnapshot(qUsers, (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        });

        // Drivers Listener - Anyone who has DRIVER capability
        const qDrivers = query(collection(db, 'users'), where('roles', 'array-contains', UserRole.DRIVER));
        const unsubDrivers = onSnapshot(qDrivers, (snapshot) => {
            setDrivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
        });

        // Tiffin Vendors Listener
        const qVendors = collection(db, 'tiffinVendors');
        const unsubVendors = onSnapshot(qVendors, (snapshot) => {
            setTiffinVendors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TiffinVendor)));
        });

        // Tiffin Orders Listener (Recent 50)
        const qTiffinOrders = collection(db, 'tiffinOrders');
        const unsubTiffinOrders = onSnapshot(qTiffinOrders, (snapshot) => {
            setTiffinOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TiffinOrder)));
        });

        // Active Rides Listener
        const qRides = query(collection(db, 'rides'), where('status', 'in', [RideStatus.SEARCHING, RideStatus.ACCEPTED, RideStatus.ARRIVED, RideStatus.STARTED]));
        const unsubRides = onSnapshot(qRides, (snapshot) => {
            setActiveRides(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RideRequest)));
        });

        // Reports Listener
        const qReports = query(collection(db, 'reports'), where('status', '==', 'OPEN'));
        const unsubReports = onSnapshot(qReports, (snapshot) => {
            setReports(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Report)));
        });

        // Promo Codes Listener
        const qPromos = collection(db, 'promoCodes');
        const unsubPromos = onSnapshot(qPromos, (snapshot) => {
            setPromoCodes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PromoCode)));
        });

        // Global Config Listener
        const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snapshot) => {
            if (snapshot.exists()) {
                setSysConfig(prev => ({ ...prev, ...snapshot.data() }));
            }
        });

        // Driver Updates Listener
        const qDriverUpdates = query(collection(db, 'driverUpdates'), where('status', '==', 'PENDING'));
        const unsubDriverUpdates = onSnapshot(qDriverUpdates, (snapshot) => {
            setDriverUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverUpdate)));
        });

        return () => {
            unsubUsers();
            unsubDrivers();
            unsubReports();
            unsubPromos();
            unsubVendors();
            unsubTiffinOrders();
            unsubRides();
            unsubConfig();
            unsubDriverUpdates();
        };
    }, []);

    // Derived Data with Filtering
    const filteredDrivers = drivers.filter(d => {
        if (driverFilter === 'PENDING') return d.isKycCompleted && !d.isApproved && !d.rejectionReason;
        if (driverFilter === 'ACTIVE') return d.isApproved && d.isActive !== false;
        if (driverFilter === 'BLOCKED') return d.rejectionReason || d.isActive === false;
        return true;
    });

    const filteredRiders = users.filter(u => {
        if (userFilter === 'ACTIVE') return u.isActive !== false;
        if (userFilter === 'BLOCKED') return u.isActive === false;
        return true;
    });

    const pendingDriversCount = drivers.filter(d => d.isKycCompleted && !d.isApproved && !d.rejectionReason).length;
    const activeDriversCount = drivers.filter(d => d.isApproved && d.isActive !== false).length;
    // const blockedDriversCount = drivers.filter(d => d.rejectionReason || d.isActive === false).length;
    // const activeRidersCount = users.filter(u => u.isActive !== false).length;
    // const blockedRidersCount = users.filter(u => u.isActive === false).length;

    const handleUserAction = async (id: string, updates: Partial<User>) => {
        try {
            await updateDoc(doc(db, 'users', id), {
                ...updates,
                updatedAt: new Date()
            });
            setActioningUser(null);
            setInspectingDriver(null);
            setReason('');
        } catch (err) {
            console.error("Action failed", err);
            alert("Administrative action failed. Check permissions.");
        }
    };

    const handleResetDriver = async (user: User) => {
        const isEcosystemPurge = window.confirm("Ecosystem Purge? OK for full deactivation, CANCEL for just Driver Reset.");

        try {
            if (isEcosystemPurge) {
                await updateDoc(doc(db, 'users', user.id), {
                    isActive: false,
                    deletedAt: new Date()
                });
                alert("Account deactivated.");
            } else {
                // Driver Reset (Re-application flow)
                const newRoles = user.roles?.filter(r => r !== UserRole.DRIVER) || [UserRole.RIDER];
                await updateDoc(doc(db, 'users', user.id), {
                    roles: newRoles,
                    role: UserRole.RIDER,
                    isApproved: false,
                    isKycCompleted: false,
                    wasDriverRemoved: true,
                    updatedAt: new Date()
                });
                alert("Partner status reset. User can re-apply.");
            }
        } catch (err) {
            alert("Action failed.");
        }
    };

    const handleSaveConfig = async () => {
        setIsConfigSaving(true);
        try {
            await setDoc(doc(db, 'system', 'config'), sysConfig);
            alert("Global Protocol Committed Successfully.");
        } catch (err) {
            alert("Protocol commit failed. Access restricted.");
        } finally {
            setIsConfigSaving(false);
        }
    };

    const handleTiffinVendorAction = async (vendorId: string, updates: Partial<TiffinVendor>) => {
        try {
            await updateDoc(doc(db, 'tiffinVendors', vendorId), updates);
        } catch (err) {
            alert("Vendor update failed.");
        }
    };

    const handleTiffinOrderAction = async (orderId: string, status: string) => {
        try {
            await updateDoc(doc(db, 'tiffinOrders', orderId), { status });
        } catch (err) {
            alert("Order update failed.");
        }
    };

    const handleCreatePromo = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const data = new FormData(form);
        const code = data.get('code') as string;
        const value = Number(data.get('value'));

        if (!code || !value) return;

        try {
            await setDoc(doc(collection(db, 'promoCodes')), {
                code: code.toUpperCase(),
                discountType: 'PERCENTAGE',
                value: value,
                maxDiscount: 100,
                expiry: Date.now() + (7 * 24 * 60 * 60 * 1000),
                usageLimit: 1000,
                usedCount: 0,
                isActive: true
            });
            form.reset();
            alert("Promo Code Created!");
        } catch (err) {
            console.error(err);
            alert("Failed to create promo");
        }
    };

    const handleDeactivatePromo = async (id: string) => {
        try {
            await updateDoc(doc(db, 'promoCodes', id), { isActive: false });
        } catch (err) {
            alert("Failed to deactivate promo");
        }
    };

    const handleResolveReport = async (id: string) => {
        try {
            await updateDoc(doc(db, 'reports', id), { status: 'RESOLVED', updatedAt: new Date() });
            alert("Anomaly Resolved & Protocol Closed.");
        } catch (err) {
            alert("Resolution protocol failed.");
        }
    };

    const handleSendBroadcast = async () => {
        if (!broadcastMsg) return;
        setIsBroadcasting(true);
        try {
            await updateDoc(doc(db, 'system', 'broadcast'), {
                message: broadcastMsg,
                timestamp: new Date(),
                active: true,
                id: Date.now().toString()
            });
            setBroadcastMsg('');
            alert("Ecosystem Broadcast Dispatched Successfully.");
        } catch (err) {
            alert("Transmission failed. Service restricted.");
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleMarkUpdateReviewed = async (updateId: string) => {
        try {
            await updateDoc(doc(db, 'driverUpdates', updateId), { status: 'REVIEWED' });
        } catch (err) {
            alert("Failed to mark update as reviewed.");
        }
    };

    // Infrastructure UI States
    const [showNotifications, setShowNotifications] = useState(false);
    const [showOpsGrid, setShowOpsGrid] = useState(false);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen w-full overflow-hidden bg-[#0f1c23] text-white font-sans selection:bg-orange-500 selection:text-white">
            {/* MOBILE NAV TOGGLE */}
            {!showSidebar && (
                <button
                    onClick={() => setShowSidebar(true)}
                    className="lg:hidden fixed bottom-6 right-6 z-[60] size-14 bg-orange-500 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-95 transition-all shadow-orange-500/20"
                >
                    <span className="material-symbols-outlined text-2xl">menu</span>
                </button>
            )}

            <AdminSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                pendingDriversCount={pendingDriversCount}
                currentTime={currentTime}
                handleLogout={handleLogout}
                showSidebar={showSidebar}
                sidebarRef={sidebarRef}
            />

            <main className="flex-1 flex flex-col min-w-0 bg-[#0f1c23] relative">
                <AdminHeader
                    activeTab={activeTab}
                    onNotificationClick={() => setShowNotifications(!showNotifications)}
                    onGridViewClick={() => setShowOpsGrid(!showOpsGrid)}
                    notificationCount={pendingDriversCount + reports.length + driverUpdates.length}
                />

                <div
                    ref={mainScrollRef}
                    className="flex-1 overflow-y-auto p-4 md:p-10 relative"
                >
                    <ScrollHint containerRef={mainScrollRef} />
                    {/* NOTIFICATION CENTER */}
                    {showNotifications && (
                        <div ref={notificationRef} className="absolute top-24 right-10 z-[100] w-96 bg-[#161B22]/95 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_50px_100px_rgba(0,0,0,0.5)] overflow-hidden animate-in slide-in-from-top-4 duration-300">
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">System Intel</h3>
                                <button onClick={() => setShowNotifications(false)} className="text-[10px] font-black uppercase text-slate-700 hover:text-white transition-colors">Dismiss</button>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto scrollbar-hide">
                                {pendingDriversCount > 0 && (
                                    <div
                                        onClick={() => { setActiveTab('drivers'); setDriverFilter('PENDING'); setShowNotifications(false); }}
                                        className="p-8 border-b border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="size-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center"><span className="material-symbols-outlined">pending_actions</span></div>
                                            <p className="text-xs font-black uppercase text-white tracking-widest">Awaiting Verification</p>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">{pendingDriversCount} partner nodes are requesting infrastructure access.</p>
                                    </div>
                                )}
                                {reports.length > 0 && (
                                    <div
                                        onClick={() => { setActiveTab('reports'); setShowNotifications(false); }}
                                        className="p-8 border-b border-white/5 hover:bg-white/[0.02] transition-all cursor-pointer group"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="size-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center"><span className="material-symbols-outlined text-xl">bug_report</span></div>
                                            <p className="text-xs font-black uppercase text-white tracking-widest">Active Anomalies</p>
                                        </div>
                                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic">{reports.length} system reports require administrative resolution.</p>
                                    </div>
                                )}
                                {driverUpdates.length > 0 && driverUpdates.map(update => (
                                    <div
                                        key={update.id}
                                        className="p-8 border-b border-white/5 hover:bg-white/[0.02] transition-all"
                                    >
                                        <div className="flex items-center gap-4 mb-3">
                                            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center"><span className="material-symbols-outlined">edit_note</span></div>
                                            <div className="flex-1">
                                                <p className="text-xs font-black uppercase text-white tracking-widest">Driver Profile Updated</p>
                                                <p className="text-[10px] text-slate-500 font-medium">{update.driverName}</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2 mb-4">
                                            {Object.entries(update.changes).map(([field, change]) => (
                                                <div key={field} className="bg-white/[0.02] rounded-xl p-3">
                                                    <p className="text-[9px] font-black uppercase text-slate-600 mb-1">{field}</p>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="text-red-400 line-through">{JSON.stringify(change.before) || 'None'}</span>
                                                        <span className="text-slate-600">→</span>
                                                        <span className="text-green-400 font-bold">{JSON.stringify(change.after)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => handleMarkUpdateReviewed(update.id)}
                                            className="w-full px-4 py-2 bg-blue-500/10 text-blue-500 text-[9px] font-black uppercase rounded-lg hover:bg-blue-500 hover:text-white transition-all"
                                        >
                                            Mark as Reviewed
                                        </button>
                                    </div>
                                ))}
                                {pendingDriversCount === 0 && reports.length === 0 && driverUpdates.length === 0 && (
                                    <div className="p-12 text-center">
                                        <span className="material-symbols-outlined text-4xl text-slate-800 mb-4 animate-pulse">check_circle</span>
                                        <p className="text-[10px] font-black uppercase text-slate-700 tracking-[0.3em]">Protocol Nominal</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* OPS GRID OVERLAY (Fast Access) */}
                    {showOpsGrid && (
                        <div className="mb-10 grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-4 duration-300">
                            {(['overview', 'live', 'drivers', 'tiffin', 'users', 'reports', 'promotions', 'broadcasts', 'settings'] as const).map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        setShowOpsGrid(false);
                                    }}
                                    className={`p-6 rounded-3xl border transition-all text-left group ${activeTab === tab ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                                >
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 leading-none">{tab}</p>
                                    <p className="text-sm font-black italic uppercase leading-none">Access Protocol</p>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* NOTIFICATION_TOAST_PROTOCOL */}
                    {(pendingDriversCount > 0 || reports.length > 0 || driverUpdates.length > 0) && !showNotifications && (
                        <div className="mb-8 flex items-center justify-between p-6 bg-orange-500/10 border border-orange-500/20 rounded-3xl animate-pulse">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-orange-500">priority_high</span>
                                <p className="text-[11px] font-black uppercase text-orange-500 tracking-[0.2em]">Infrastructure Anomalies Detected: {pendingDriversCount + reports.length + driverUpdates.length} Nodes Pending Audit</p>
                            </div>
                            <button onClick={() => setShowNotifications(true)} className="px-4 py-1.5 bg-orange-500 text-white text-[9px] font-black uppercase rounded-lg shadow-lg">Review Manifest</button>
                        </div>
                    )}

                    {/* MODULAR TABS */}
                    <div className="min-h-full pb-32">
                        {activeTab === 'overview' && (
                            <OverviewTab
                                users={users}
                                drivers={drivers}
                                activeDriversCount={activeDriversCount}
                                pendingDriversCount={pendingDriversCount}
                                tiffinOrders={tiffinOrders}
                                stats={stats}
                                trafficData={trafficData}
                                setActiveTab={setActiveTab}
                            />
                        )}

                        {activeTab === 'drivers' && (
                            <FleetTab
                                drivers={drivers}
                                driverFilter={driverFilter}
                                setDriverFilter={setDriverFilter}
                                setInspectingDriver={setInspectingDriver}
                                setActioningUser={setActioningUser}
                                handleResetDriver={handleResetDriver}
                                handleUserAction={handleUserAction}
                            />
                        )}

                        {activeTab === 'users' && (
                            <RidersTab
                                users={users}
                                userFilter={userFilter}
                                setUserFilter={setUserFilter}
                                handleUserAction={handleUserAction}
                                handleResetDriver={handleResetDriver}
                            />
                        )}

                        {activeTab === 'reports' && (
                            <ReportsTab
                                reports={reports}
                                handleResolveReport={handleResolveReport}
                            />
                        )}

                        {activeTab === 'promotions' && (
                            <PromotionsTab
                                promoCodes={promoCodes}
                                handleCreatePromo={handleCreatePromo}
                                handleDeactivatePromo={handleDeactivatePromo}
                            />
                        )}

                        {activeTab === 'live' && (
                            <LiveOpsTab activeRides={activeRides} />
                        )}

                        {activeTab === 'tiffin' && (
                            <TiffinTab
                                tiffinVendors={tiffinVendors}
                                tiffinOrders={tiffinOrders}
                                handleTiffinVendorAction={handleTiffinVendorAction}
                                handleTiffinOrderAction={handleTiffinOrderAction}
                            />
                        )}

                        {activeTab === 'settings' && (
                            <SettingsTab
                                sysConfig={sysConfig}
                                setSysConfig={setSysConfig}
                                handleSaveConfig={handleSaveConfig}
                                isConfigSaving={isConfigSaving}
                            />
                        )}

                        {activeTab === 'broadcasts' && (
                            <BroadcastTab
                                broadcastMsg={broadcastMsg}
                                setBroadcastMsg={setBroadcastMsg}
                                isBroadcasting={isBroadcasting}
                                handleSendBroadcast={handleSendBroadcast}
                            />
                        )}
                    </div>
                </div>
            </main>

            <AdminModals
                inspectingDriver={inspectingDriver}
                setInspectingDriver={setInspectingDriver}
                actioningUser={actioningUser}
                setActioningUser={setActioningUser}
                reason={reason}
                setReason={setReason}
                handleUserAction={handleUserAction}
                handleResetDriver={handleResetDriver}
                users={users}
                drivers={drivers}
            />
        </div>
    );
};

export default AdminHQ;
