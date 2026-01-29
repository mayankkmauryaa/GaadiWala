import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { Coordinates } from '../types';
import { animateMarker } from '../utils/MarkerAnimation';
import { MaterialIcons } from '@expo/vector-icons';

interface Props {
    driverId: string;
    coordinate: { latitude: number, longitude: number };
    title?: string;
}

export const AnimatedMarker: React.FC<Props> = ({ driverId, coordinate, title }) => {
    const [currentCoord, setCurrentCoord] = useState(coordinate);
    const prevCoordRef = useRef(coordinate);

    useEffect(() => {
        // Only animate if position actually changed
        if (prevCoordRef.current.latitude !== coordinate.latitude ||
            prevCoordRef.current.longitude !== coordinate.longitude) {

            const start: Coordinates = {
                lat: prevCoordRef.current.latitude,
                lng: prevCoordRef.current.longitude
            };
            const end: Coordinates = {
                lat: coordinate.latitude,
                lng: coordinate.longitude
            };

            const cleanup = animateMarker(start, end, 1000, (interpolated) => {
                setCurrentCoord({
                    latitude: interpolated.lat,
                    longitude: interpolated.lng
                });
            });

            prevCoordRef.current = coordinate;
            return cleanup;
        }
    }, [coordinate]);

    return (
        <Marker
            coordinate={currentCoord}
            title={title}
            tracksViewChanges={false} // Performance optimization
        >
            <View style={{ backgroundColor: '#fff', padding: 4, borderRadius: 20, elevation: 4 }}>
                <MaterialIcons name={"directions-car" as any} size={24} color="#ea580c" />
            </View>
        </Marker>
    );
};
