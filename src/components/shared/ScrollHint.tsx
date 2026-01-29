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
        <>
        </>
    );
};

export default ScrollHint;
