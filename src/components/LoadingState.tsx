import React from 'react';

export type LoadingVariant = 'spinner' | 'skeleton' | 'pulse';
export type LoadingLayout = 'list' | 'card' | 'map' | 'fullscreen';

interface LoadingStateProps {
    variant?: LoadingVariant;
    layout?: LoadingLayout;
    message?: string;
}

/**
 * Unified loading component with multiple variants and layouts
 */
const LoadingState: React.FC<LoadingStateProps> = ({
    variant = 'spinner',
    layout = 'fullscreen',
    message = 'Loading...'
}) => {
    if (variant === 'spinner') {
        return (
            <div className={`flex items-center justify-center ${layout === 'fullscreen' ? 'h-screen' : 'h-full min-h-[200px]'}`}>
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                    <p className="text-gray-600 text-sm font-medium">{message}</p>
                </div>
            </div>
        );
    }

    if (variant === 'skeleton') {
        if (layout === 'list') {
            return (
                <div className="space-y-4 p-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="animate-pulse flex space-x-4">
                            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
                            <div className="flex-1 space-y-3 py-1">
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (layout === 'card') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="animate-pulse">
                            <div className="bg-gray-300 h-48 rounded-t-lg"></div>
                            <div className="bg-white p-4 rounded-b-lg space-y-3">
                                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-300 rounded w-full"></div>
                                <div className="h-3 bg-gray-300 rounded w-5/6"></div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (layout === 'map') {
            return (
                <div className="h-full w-full bg-gray-100 animate-pulse flex items-center justify-center">
                    <div className="text-center">
                        <div className="inline-block h-16 w-16 bg-gray-300 rounded-full mb-4"></div>
                        <p className="text-gray-500 text-sm">Loading map...</p>
                    </div>
                </div>
            );
        }
    }

    if (variant === 'pulse') {
        return (
            <div className={`${layout === 'fullscreen' ? 'h-screen' : 'h-full'} w-full bg-gray-50 animate-pulse flex items-center justify-center`}>
                <div className="text-gray-400 text-sm font-medium">{message}</div>
            </div>
        );
    }

    return null;
};

export default LoadingState;
