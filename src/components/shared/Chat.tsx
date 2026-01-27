import React, { useState, useEffect, useRef } from 'react';
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../../firebase';
import { Message } from '../../types';
import ScrollHint from './ScrollHint';

interface ChatProps {
    rideId: string;
    currentUserId: string;
    onClose: () => void;
    recipientName: string;
}

const Chat: React.FC<ChatProps> = ({ rideId, currentUserId, onClose, recipientName }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const messagesRef = collection(db, 'rides', rideId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Message));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [rideId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            const messagesRef = collection(db, 'rides', rideId, 'messages');
            await addDoc(messagesRef, {
                senderId: currentUserId,
                text: newMessage.trim(),
                timestamp: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div className="flex flex-col h-[500px] w-full max-w-md bg-[#161B22] rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-500 border border-white/10 relative">
            <div className="flex items-center justify-between p-6 border-b border-white/5 bg-[#0A0E12] text-white">
                <div>
                    <h3 className="font-bold">Chat with {recipientName}</h3>
                    <p className="text-xs opacity-80">Connected</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                    <span className="material-symbols-outlined text-white">close</span>
                </button>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0A0E12] scrollbar-hide relative"
            >
                <ScrollHint containerRef={scrollRef} />
                {messages.length === 0 && (
                    <div className="text-center text-gray-400 mt-10">
                        <p className="text-sm">No messages yet.</p>
                        <p className="text-xs">Send a message to coordinate with {recipientName}.</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
                    >
                        <div className={`
                            max-w-[80%] rounded-2xl px-5 py-3 text-xs shadow-xl font-bold tracking-tight italic
                            ${msg.senderId === currentUserId
                                ? 'bg-[#22c55e] text-black rounded-tr-none'
                                : 'bg-white/5 text-slate-200 rounded-tl-none border border-white/10'
                            }
                        `}>
                            {msg.text}
                        </div>
                    </div>
                ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-6 bg-[#161B22] border-t border-white/5 flex gap-3">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="IDENTIFIED_COMMS_INTEL..."
                    className="flex-1 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-xs font-black italic tracking-widest text-[#22c55e] placeholder:text-slate-600 focus:outline-none focus:border-[#22c55e]/50 transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="size-14 bg-[#22c55e] text-black rounded-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center shadow-lg shadow-[#22c55e]/10"
                >
                    <span className="material-symbols-outlined font-black">send</span>
                </button>
            </form>
        </div>
    );
};

export default Chat;
