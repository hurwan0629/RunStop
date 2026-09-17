import {
  NaverMapMarkerOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  NaverMapArrowheadPathOverlay,
} from '@mj-studio/react-native-naver-map';
import {
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { LocationPoint, RouteFacilityPoint } from '../types';

type CourseMapProps = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints?: LocationPoint[];
  facilityPoints?: RouteFacilityPoint[];
  routePath?: LocationPoint[];
  trackedRoutePath?: LocationPoint[];
  currentLocation?: LocationPoint;
  followCurrentLocation?: boolean;
  style?: StyleProp<ViewStyle>;
  showStartDirection?: boolean;
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
  facilityPoints = [],
  routePath = [],
  trackedRoutePath = [],
  currentLocation,
  followCurrentLocation = false,
  showStartDirection = false,
  style,
}: CourseMapProps) {
  const focusPoint = followCurrentLocation
    ? currentLocation ?? startPoint ?? DEFAULT_LOCATION
    : startPoint ?? currentLocation ?? DEFAULT_LOCATION;

  const startDirectionPath = showStartDirection
    ? getStartDirectionPath(routePath, 80)
    : [];

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
        {startDirectionPath.length >= 2 ? (
          <NaverMapArrowheadPathOverlay
            color="#A8F500"
            coords={startDirectionPath.map(toMapCoordinate)}
            headSizeRatio={3}
            outlineColor="#FFFFFF"
            outlineWidth={1}
            width={8}
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

        {facilityPoints.map((point, index) => (
          <NaverMapMarkerOverlay
            caption={{
              text: `${point.type === 'toilet' ? '화장실' : '편의점'}${point.name ? ` · ${point.name}` : ''}`,
            }}
            width={20}
            height={26.5}
            key={`facility-${index}`}
            latitude={point.lat}
            longitude={point.lng}>
            <View
              collapsable={false}
              key={point.type}
              style={styles.facilityMarker}>
              <Svg width={20} height={26.5} viewBox="0 0 40 53">
                <Path
                  d="M20 1C9.5 1 1 9.5 1 20c0 14 19 32 19 32s19-18 19-32C39 9.5 30.5 1 20 1Z"
                  fill={point.type === 'toilet' ? '#269DCE' : '#E65B96'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                <Path
                  d={point.type === 'toilet'
                    ? 'M14 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM10 15h8v9h-2v8h-4v-8h-2ZM27 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM24 15h6l3 11h-4v6h-4v-6h-4Z'
                    : 'M9 8h22v4H9ZM8 14h24l2 7h-3v11H9V21H6ZM12 21v8h6v-8ZM22 21v8h6v-8Z'}
                  fill="#FFFFFF"
                  fillRule="evenodd"
                />
              </Svg>
            </View>
          </NaverMapMarkerOverlay>
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

// 지도에 표시할 화살표를 그릴 구간을 뽑기
function getStartDirectionPath(
  routePath: LocationPoint[],
  targetDistanceMeters: number,
) : LocationPoint[] {
  if (routePath.length < 2) {
    return [];
  }

  const directionPath = [routePath[0]];
  let accumulatedDistance = 0;

  for (let index = 1; index < routePath.length; index += 1) {
    const previousPoint = routePath[index - 1];
    const currentPoint = routePath[index];

    accumulatedDistance += getDistanceMeters(previousPoint, currentPoint);
    directionPath.push(currentPoint);

    if (accumulatedDistance >= targetDistanceMeters) {
      break;
    }
  }
  return directionPath;
}

// getDistanceMeters
function getDistanceMeters(
  from: LocationPoint,
  to: LocationPoint,
): number {
  const earthRadius = 6371000;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 100;

  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);

  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadius * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a),
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
  facilityMarker: {
    // Native facility symbols are 40 × 53 dp; render at half size.
    width: 20,
    height: 26.5,
  },
});
