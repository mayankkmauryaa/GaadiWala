import { Coordinates } from '../types';

/**
 * Interpolates between two coordinates for smooth marker animation
 * @param start Starting coordinates
 * @param end Ending coordinates
 * @param progress Progress value between 0 and 1
 * @returns Interpolated coordinates
 */
export function interpolateCoordinates(
    start: Coordinates,
    end: Coordinates,
    progress: number
): Coordinates {
    return {
        lat: start.lat + (end.lat - start.lat) * progress,
        lng: start.lng + (end.lng - start.lng) * progress
    };
}

/**
 * Animates a marker from one position to another over a duration
 * @param start Starting coordinates
 * @param end Ending coordinates
 * @param duration Duration in milliseconds
 * @param onUpdate Callback called with interpolated coordinates
 */
export function animateMarker(
    start: Coordinates,
    end: Coordinates,
    duration: number,
    onUpdate: (coords: Coordinates) => void
): () => void {
    const startTime = Date.now();
    let animationFrame: number;

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);

        const interpolated = interpolateCoordinates(start, end, easedProgress);
        onUpdate(interpolated);

        if (progress < 1) {
            animationFrame = requestAnimationFrame(animate);
        }
    };

    animate();

    // Return cleanup function
    return () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    };
}
