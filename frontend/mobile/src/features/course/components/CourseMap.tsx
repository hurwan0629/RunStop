import {
  NaverMapMarkerOverlay,
  NaverMapMultiPathOverlay,
  NaverMapPathOverlay,
  NaverMapView,
  NaverMapArrowheadPathOverlay,
  type NaverMapViewRef,
  type Region,
} from '@mj-studio/react-native-naver-map';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import type { LocationPoint, RouteFacilityPoint, RouteMapLayers } from '../types';

type CourseMapProps = {
  startPoint?: LocationPoint;
  endPoint?: LocationPoint;
  waypoints?: LocationPoint[];
  facilityPoints?: RouteFacilityPoint[];
  mapLayers?: RouteMapLayers | null;
  averageSlopePct?: number | null;
  mapExpanded?: boolean;
  onToggleExpanded?: () => void;
  routePath?: LocationPoint[];
  trackedRoutePath?: LocationPoint[];
  trackedRoutePaths?: LocationPoint[][];
  highlightedPath?: LocationPoint[];
  featurePath?: LocationPoint[];
  currentLocation?: LocationPoint;
  followCurrentLocation?: boolean;
  style?: StyleProp<ViewStyle>;
  showStartDirection?: boolean;
  showLayerControls?: boolean;
};

const DEFAULT_LOCATION: LocationPoint = {
  name: '서울시청',
  lat: 37.5665,
  lng: 126.978,
};

const LAYER_LABELS = {
  toilet: '화장실',
  store: '편의점',
  slope: '경사도',
  nature: '녹지·하천',
  night: '야간 조명',
};
type LayerKey = keyof typeof LAYER_LABELS;

const NIGHT_LABELS = { cctv: 'CCTV', security: '보안등', light: '가로등' };
const NIGHT_MIN_ZOOM = 16;

function slopeColor(slope: number | null) {
  if (slope === null) return '#8B929C';
  if (slope < 5) return '#27A466';
  if (slope < 10) return '#EEA51B';
  return '#E45151';
}

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
  mapLayers,
  averageSlopePct,
  mapExpanded = false,
  onToggleExpanded,
  routePath = [],
  trackedRoutePath = [],
  trackedRoutePaths,
  highlightedPath,
  featurePath,
  currentLocation,
  followCurrentLocation = false,
  showStartDirection = false,
  showLayerControls = true,
  style,
}: CourseMapProps) {
  // 표시 토글은 지도 안에서만 관리한다. 변경 시 추천 API를 다시 호출하지 않는다.
  const [visible, setVisible] = useState({
    toilet: true,
    store: true,
    slope: false,
    nature: false,
    night: false,
  });
  const [viewport, setViewport] = useState<{ zoom: number; region?: Region }>({ zoom: 15 });
  const mapRef = useRef<NaverMapViewRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFollowing, setIsFollowing] = useState(followCurrentLocation);

  const focusPoint = followCurrentLocation
    ? currentLocation ?? startPoint ?? DEFAULT_LOCATION
    : startPoint ?? currentLocation ?? DEFAULT_LOCATION;
  const startLat = startPoint?.lat;
  const startLng = startPoint?.lng;
  const currentLat = currentLocation?.lat;
  const currentLng = currentLocation?.lng;

  // 기록 지도는 전체 코스·주행을 맞추고, 구간 선택 시 굽은 부분까지 포함한다.
  const recordBounds = useMemo(() => {
    const points = highlightedPath ?? (trackedRoutePaths ? routePath.concat(...trackedRoutePaths) : []);
    if (!points.length) return null;
    return points.reduce((bounds, point) => ({
      south: Math.min(bounds.south, point.lat), north: Math.max(bounds.north, point.lat),
      west: Math.min(bounds.west, point.lng), east: Math.max(bounds.east, point.lng),
    }), { south: 90, north: -90, west: 180, east: -180 });
  }, [highlightedPath, routePath, trackedRoutePaths]);

  useEffect(() => {
    if (!mapReady || !recordBounds) return;
    mapRef.current?.animateCameraWithTwoCoords({
      coord1: { latitude: recordBounds.south - 0.0002, longitude: recordBounds.west - 0.0002 },
      coord2: { latitude: recordBounds.north + 0.0002, longitude: recordBounds.east + 0.0002 },
      duration: 500,
    });
  }, [mapReady, recordBounds]);

  // 출발지 선택과 GPS 추적을 분리해 추적 OFF 시 카메라가 출발지로 튀지 않게 한다.
  useEffect(() => {
    if (trackedRoutePaths || startLat === undefined || startLng === undefined) return;
    mapRef.current?.animateCameraTo({
      latitude: startLat,
      longitude: startLng,
      duration: 500,
    });
  }, [startLat, startLng, trackedRoutePaths]);

  useEffect(() => {
    if (!isFollowing || currentLat === undefined || currentLng === undefined) return;
    mapRef.current?.animateCameraTo({
      latitude: currentLat,
      longitude: currentLng,
      duration: 500,
    });
  }, [isFollowing, currentLat, currentLng]);

  // 토글이 OFF여도 코스 전체 시설 수는 유지한다. 화면 안 마커 수와 구분한다.
  const counts = useMemo(() => {
    const result = { toilet: 0, store: 0, light: 0, security: 0, cctv: 0, walklight: 0 };
    for (const point of facilityPoints) result[point.type] += 1;
    return result;
  }, [facilityPoints]);
  const natureCounts = mapLayers?.natureCounts;
  const summaries = {
    toilet: `${counts.toilet}개`,
    store: `${counts.store}개`,
    night: `${counts.light + counts.security + counts.cctv}개`,
    slope: averageSlopePct == null ? '평균 정보 없음' : `평균 ${averageSlopePct.toFixed(1)}%`,
    nature: natureCounts
      ? `공원 ${natureCounts.park ?? '—'}개 · 하천 ${natureCounts.water ?? '—'}개`
      : '개수 정보 없음',
  };

  const available = {
    toilet: true,
    store: true,
    slope: mapLayers?.availability.slope ?? false,
    nature: Boolean(mapLayers?.availability.park || mapLayers?.availability.water),
    night: counts.light + counts.security + counts.cctv > 0,
  };

  const layerPath = featurePath ?? routePath;
  const slopeParts = useMemo(() => (mapLayers?.slopeSegments ?? [])
    .filter(segment => segment.fromIndex >= 0 && segment.toIndex < layerPath.length)
    .map(segment => ({
      coords: layerPath.slice(segment.fromIndex, segment.toIndex + 1).map(toMapCoordinate),
      color: slopeColor(segment.slopePct),
      outlineColor: '#FFFFFF',
    })), [mapLayers, layerPath]);

  // 조명은 확대된 화면 안의 시설만 마운트해 수백 개의 화면 밖 마커 생성을 피한다.
  const nightPoints = visible.night && viewport.zoom >= NIGHT_MIN_ZOOM
    ? facilityPoints.filter(point => {
      if (!(point.type in NIGHT_LABELS)) return false;
      const region = viewport.region;
      return region !== undefined
        && point.lat >= region.latitude
        && point.lat <= region.latitude + region.latitudeDelta
        && point.lng >= region.longitude
        && point.lng <= region.longitude + region.longitudeDelta;
    })
    : [];

  const startDirectionPath = showStartDirection
    ? getStartDirectionPath(routePath, 80)
    : [];

  return (
    <View style={[styles.container, style]}>
      <NaverMapView
        ref={mapRef}
        animationDuration={500}
        initialCamera={{ latitude: focusPoint.lat, longitude: focusPoint.lng, zoom: 15 }}
        onInitialized={() => setMapReady(true)}
        onCameraIdle={({ zoom, region }) => setViewport({ zoom: zoom ?? 15, region })}
        isShowCompass
        isShowLocationButton={false}
        mapType="Basic"
        style={styles.map}>
        {/* 자연환경은 넓은 바깥 선으로 그려 중앙의 경사 색과 함께 볼 수 있다. */}
        {visible.nature && mapLayers?.natureSegments.map((segment, index) => (
          <NaverMapPathOverlay
            key={`nature-${index}`}
            coords={segment.path.map(toMapCoordinate)}
            color={segment.type === 'park' ? '#59B96E' : '#4CACEB'}
            width={segment.type === 'park' ? 15 : 11}
            zIndex={segment.type === 'park' ? 0 : 1}
          />
        ))}

        {routePath.length >= 2 ? (
          <NaverMapPathOverlay
            color="#100078"
            coords={routePath.map(toMapCoordinate)}
            outlineColor="#FFFFFF"
            outlineWidth={1}
            width={5}
            zIndex={2}
          />
        ) : null}

        {visible.slope && slopeParts.length > 0 ? (
          <NaverMapMultiPathOverlay
            pathParts={slopeParts}
            width={5}
            outlineWidth={1}
            zIndex={3}
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
            zIndex={5}
          />
        ) : null}

        {trackedRoutePath.length >= 2 ? (
          <NaverMapPathOverlay
            color="#A7EF2A"
            coords={trackedRoutePath.map(toMapCoordinate)}
            outlineColor="#FFFFFF"
            outlineWidth={1}
            width={6}
            zIndex={4}
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

        {facilityPoints.filter(point => (
          (point.type === 'toilet' || point.type === 'store') && visible[point.type]
        )).map((point, index) => (
          <NaverMapMarkerOverlay
            caption={{
              minZoom: 15,
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

        {nightPoints.map((point, index) => {
          if (point.type === 'toilet' || point.type === 'store' || point.type === 'walklight') return null;

          return (
            <NaverMapMarkerOverlay
              key={`night-${point.type}-${index}`}
              latitude={point.lat}
              longitude={point.lng}
              width={28}
              height={34}
              minZoom={NIGHT_MIN_ZOOM}
              caption={{ minZoom: 18, text: `${NIGHT_LABELS[point.type]} · ${point.name ?? ''}` }}>
              <View collapsable={false} style={styles.nightMarker}>
                <Svg width={28} height={34} viewBox="0 0 28 34">
                  <Path d="M14 1C7 1 1 6 1 13c0 9 13 20 13 20s13-11 13-20C27 6 21 1 14 1Z"
                    fill="#6828BC" stroke="#FFFFFF" strokeWidth={2} />
                  <Path d="M16 5 8 15h5l-1 8 8-12h-5Z" fill="#FFFFFF" />
                </Svg>
              </View>
            </NaverMapMarkerOverlay>
          );
        })}

        {currentLocation ? (
          <NaverMapMarkerOverlay
            caption={{ text: '현재 위치' }}
            image={{ symbol: 'blue' }}
            latitude={currentLocation.lat}
            longitude={currentLocation.lng}
          />
        ) : null}
        {/* 실제 GPS의 단절 구간은 각각의 overlay로 지도 안에 그린다. */}
        {(trackedRoutePaths ?? []).filter(path => path.length >= 2).map((path, index) => (
          <NaverMapPathOverlay key={`record-${index}`} coords={path.map(toMapCoordinate)}
            color="#169E84" width={5} outlineColor="#FFFFFF" outlineWidth={1} zIndex={4} />
        ))}
        {highlightedPath && highlightedPath.length >= 2 ? (
          <NaverMapPathOverlay coords={highlightedPath.map(toMapCoordinate)}
            color="#F06D24" width={8} outlineWidth={1} outlineColor="#FFFFFF" zIndex={5} />
        ) : null}
      </NaverMapView>

      {/* 경로가 있는 상세·러닝 화면에서만 표시 제어와 범례를 제공한다. */}
      {showLayerControls && (routePath.length >= 2 || layerPath.length >= 2) ? (
        <View pointerEvents="box-none" style={styles.layerPanel}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.layerButtons}>
            {(Object.keys(LAYER_LABELS) as LayerKey[]).map(key => (
              <Pressable
                key={key}
                accessibilityRole="switch"
                accessibilityLabel={`${LAYER_LABELS[key]} ${summaries[key]} 표시${available[key] ? '' : ', 데이터 없음'}`}
                accessibilityState={{ checked: visible[key] && available[key], disabled: !available[key] }}
                disabled={!available[key]}
                onPress={() => setVisible(previous => ({ ...previous, [key]: !previous[key] }))}
                style={[
                  styles.layerButton,
                  visible[key] && available[key] && styles.layerButtonActive,
                  !available[key] && styles.layerButtonDisabled,
                ]}>
                <Text style={[styles.layerButtonText, visible[key] && available[key] && styles.layerButtonTextActive]}>
                  {LAYER_LABELS[key]} · {available[key] ? summaries[key] : '정보 없음'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
          <View pointerEvents="none" style={styles.legend}>
            {!mapLayers ? <Text style={styles.legendText}>추가 표시 정보가 없는 코스입니다. 새로 추천받으면 확인할 수 있어요.</Text> : null}
            {visible.slope && available.slope ? (
              <Text style={styles.legendText}>
                <Text style={{ color: '#27A466' }}>● 5% 미만 </Text>
                <Text style={{ color: '#EEA51B' }}>● 5~10% 미만 </Text>
                <Text style={{ color: '#E45151' }}>● 10% 이상 </Text>
                <Text style={{ color: '#8B929C' }}>● 정보 없음</Text>
              </Text>
            ) : null}
            {visible.nature && available.nature ? (
              <Text style={styles.legendText}>
                <Text style={{ color: '#368C49' }}>녹색: 공원 </Text>
                <Text style={{ color: '#227CAF' }}>파랑: 하천 </Text>
                · 50m 이내 구간
                {!mapLayers?.availability.park ? ' · 공원 데이터 없음' : ''}
                {!mapLayers?.availability.water ? ' · 하천 데이터 없음' : ''}
                {mapLayers?.natureSegments.length === 0 ? ' · 해당 구간 없음' : ''}
              </Text>
            ) : null}
            {visible.night && available.night ? (
              <Text style={styles.legendText}>
                {(Object.keys(NIGHT_LABELS) as (keyof typeof NIGHT_LABELS)[])
                  .filter(type => counts[type] > 0)
                  .map(type => `${NIGHT_LABELS[type]} ${counts[type]}개`).join(' · ')}
                {viewport.zoom < NIGHT_MIN_ZOOM ? ' · 확대하면 표시됩니다' : ' · 경로 주변 50m'}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* 지도 관련 조작은 패널을 숨겨도 남겨 두어 언제든 되돌릴 수 있다. */}
      <View pointerEvents="box-none" style={styles.mapActions}>
        {currentLocation || followCurrentLocation ? (
          <Pressable
            accessibilityRole="switch"
            accessibilityLabel="현재 위치 따라가기"
            accessibilityState={{ checked: isFollowing, disabled: !currentLocation }}
            disabled={!currentLocation}
            onPress={() => setIsFollowing(previous => !previous)}
            style={[styles.layerButton, isFollowing && styles.layerButtonActive]}>
            <Text style={[styles.layerButtonText, isFollowing && styles.layerButtonTextActive]}>
              {currentLocation ? `위치 따라가기 ${isFollowing ? 'ON' : 'OFF'}` : 'GPS 확인 중'}
            </Text>
          </Pressable>
        ) : null}

        {onToggleExpanded ? (
          <Pressable accessibilityRole="button" onPress={onToggleExpanded} style={styles.layerButton}>
            <Text style={styles.layerButtonText}>{mapExpanded ? '러닝 UI 보기' : '지도 크게 보기'}</Text>
          </Pressable>
        ) : null}
      </View>
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
  mapActions: {
    position: 'absolute',
    right: 12,
    bottom: 24,
    alignItems: 'flex-end',
    gap: 8,
  },
  nightMarker: {
    width: 28,
    height: 34,
  },
  layerPanel: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
  },
  layerButtons: {
    gap: 6,
    paddingBottom: 4,
  },
  layerButton: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9DEE3',
  },
  layerButtonActive: {
    backgroundColor: '#100078',
    borderColor: '#100078',
  },
  layerButtonDisabled: {
    opacity: 0.6,
  },
  layerButtonText: {
    fontSize: 12,
    color: '#424952',
    fontWeight: '600',
  },
  layerButtonTextActive: {
    color: '#FFFFFF',
  },
  legend: {
    alignItems: 'flex-start',
    gap: 3,
  },
  legendText: {
    fontSize: 11,
    color: '#424952',
    backgroundColor: '#FFFFFFE8',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
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
