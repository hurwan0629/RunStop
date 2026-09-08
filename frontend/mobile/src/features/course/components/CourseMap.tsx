import { useEffect, useRef } from 'react';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
} from 'react-native-maps';

import type { LocationPoint } from '../types';

type CourseMapProps = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints?: LocationPoint[];
  routePath?: LocationPoint[];
  currentLocation?: LocationPoint;
  style?: StyleProp<ViewStyle>;
};

const DEFAULT_LOCATION: LocationPoint = {
  name: '서울시청',
  lat: 37.5665,
  lng: 126.978,
};

function toMapCoordinate(point: LocationPoint) {
  return {
    latitude: point.lat,
    longitude: point.lng,
  };
}

/**
 * 코스 설정, 코스 상세, 실시간 러닝에서 공통으로 사용하는 지도입니다.
 */
export function CourseMap({
  startPoint,
  endPoint,
  waypoints = [],
  routePath = [],
  currentLocation,
  style,
}: CourseMapProps) {
  const mapRef = useRef<MapView>(null);
  const focusPoint = startPoint ?? currentLocation ?? DEFAULT_LOCATION;

  useEffect(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: focusPoint.lat,
        longitude: focusPoint.lng,
        latitudeDelta: 0.012,
        longitudeDelta: 0.012,
      },
      500,
    );
  }, [focusPoint.lat, focusPoint.lng]);

  return (
    <View style={[styles.container, style]}>
      <MapView
        ref={mapRef}
        initialRegion={{
          latitude: DEFAULT_LOCATION.lat,
          longitude: DEFAULT_LOCATION.lng,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
        loadingBackgroundColor="#E8EEF8"
        loadingEnabled
        loadingIndicatorColor="#06065C"
        mapType="standard"
        showsCompass
        showsMyLocationButton={false}
        style={styles.map}>
        {routePath.length >= 2 ? (
          <Polyline
            coordinates={routePath.map(toMapCoordinate)}
            strokeColor="#172E38"
            strokeWidth={5}
          />
        ) : null}

        {startPoint ? (
          <Marker
            coordinate={toMapCoordinate(startPoint)}
            pinColor="#22A06B"
            title={startPoint.name ?? '출발지'}
          />
        ) : null}

        {endPoint ? (
          <Marker
            coordinate={toMapCoordinate(endPoint)}
            pinColor="#E5484D"
            title={endPoint.name ?? '도착지'}
          />
        ) : null}

        {waypoints.map((point, index) => (
          <Marker
            coordinate={toMapCoordinate(point)}
            key={point.id ?? `waypoint-${index}`}
            pinColor="#F5A524"
            title={point.name ?? `경유지 ${index + 1}`}
          />
        ))}

        {currentLocation ? (
          <Marker
            coordinate={toMapCoordinate(currentLocation)}
            pinColor="#3478F6"
            title="현재 위치"
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    overflow: 'hidden',
    borderRadius: 20,
    backgroundColor: '#E7EAEC',
  },
  map: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
});
