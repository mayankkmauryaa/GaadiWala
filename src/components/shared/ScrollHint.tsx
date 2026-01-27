import React, { useState, useEffect } from 'react';

interface ScrollHintProps {
    containerRef: React.RefObject<HTMLElement | null>;
    color?: string;
}

const ScrollHint: React.FC<ScrollHintProps> = ({ containerRef, color = 'text-[#00D1FF]' }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkScroll = () => {
            const el = containerRef.current;
            if (!el) return;

            // Show if there is scrollable content and we haven't scrolled much yet
            const hasScrollableContent = el.scrollHeight > el.clientHeight + 20;
            const isAtTop = el.scrollTop < 20;

            setIsVisible(hasScrollableContent && isAtTop);
        };

        const el = containerRef.current;
        if (el) {
            checkScroll();
            el.addEventListener('scroll', checkScroll);
            window.addEventListener('resize', checkScroll);
        }

        return () => {
            if (el) {
                el.removeEventListener('scroll', checkScroll);
                window.removeEventListener('resize', checkScroll);
            }
        };
    }, [containerRef]);

    if (!isVisible) return null;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-1 animate-bounce pointer-events-none lg:hidden">
            <span className={`material-symbols-outlined ${color} text-4xl drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>
                keyboard_double_arrow_down
            </span>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${color} bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm`}>
                More Content
            </span>
        </div>
    );
};

export default ScrollHint;
