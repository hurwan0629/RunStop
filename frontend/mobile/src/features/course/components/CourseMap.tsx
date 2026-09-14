import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
} from '@mj-studio/react-native-naver-map';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

import type { LocationPoint } from '../types';

type CourseMapProps = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints?: LocationPoint[];
  routePath?: LocationPoint[];
  trackedRoutePath?: LocationPoint[];
  currentLocation?: LocationPoint;
  followCurrentLocation?: boolean;
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
  trackedRoutePath = [],
  currentLocation,
  followCurrentLocation = false,
  style,
}: CourseMapProps) {
  const focusPoint = followCurrentLocation
    ? currentLocation ?? startPoint ?? DEFAULT_LOCATION
    : startPoint ?? currentLocation ?? DEFAULT_LOCATION;

  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        animationDuration={500}
        camera={{
          latitude: focusPoint.lat,
          longitude: focusPoint.lng,
          zoom: 15,
        }}
        isShowCompass
        isShowLocationButton={false}
        mapType="Basic"
        style={styles.map}>
        {routePath.length >= 2 ? (
          <NaverMapPathOverlay
            color="#100078"
            coords={routePath.map(toMapCoordinate)}
            outlineColor="#FFFFFF"
            outlineWidth={1}
            width={5}
          />
        ) : null}

        {trackedRoutePath.length >= 2 ? (
          <NaverMapPathOverlay
            color="#A7EF2A"
            coords={trackedRoutePath.map(toMapCoordinate)}
            outlineColor="#FFFFFF"
            outlineWidth={1}
            width={6}
          />
        ) : null}

        {startPoint ? (
          <NaverMapMarkerOverlay
            caption={{ text: startPoint.name ?? '출발지' }}
            image={{ symbol: 'green' }}
            latitude={startPoint.lat}
            longitude={startPoint.lng}
          />
        ) : null}

        {endPoint ? (
          <NaverMapMarkerOverlay
            caption={{ text: endPoint.name ?? '도착지' }}
            image={{ symbol: 'red' }}
            latitude={endPoint.lat}
            longitude={endPoint.lng}
          />
        ) : null}

        {waypoints.map((point, index) => (
          <NaverMapMarkerOverlay
            caption={{ text: point.name ?? `경유지 ${index + 1}` }}
            image={{ symbol: 'yellow' }}
            key={point.id ?? `waypoint-${index}`}
            latitude={point.lat}
            longitude={point.lng}
          />
        ))}

        {currentLocation ? (
          <NaverMapMarkerOverlay
            caption={{ text: '현재 위치' }}
            image={{ symbol: 'blue' }}
            latitude={currentLocation.lat}
            longitude={currentLocation.lng}
          />
        ) : null}
      </NaverMapView>
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
