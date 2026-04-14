import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Location from "expo-location";
import { useUser } from "../../context/UserContext";
import { locationService } from "../../services/locationService";

const GREEN_PRIMARY = '#F97316';
const GREEN_DARK = '#10221A';
const GREEN_MUTED = '#153D2E';

const mapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0D1F1A" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6B8F7A" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0D1F1A" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#F97316" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1A2E24" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#122018" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#7EA98A" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1F3428" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1A2E24" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#071410" }] },
];

export default function LocationScreen() {
  const router = useRouter();
  const { authState } = useUser();
  const mapRef = useRef<MapView>(null);

  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState<string>("Fetching location...");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [pinging, setPinging] = useState(false);

  // Pulse animation for the GPS dot
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 2, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(pulseOpacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
          Animated.timing(pulseOpacity, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
        ]),
      ])
    ).start();
  }, []);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const results = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (results[0]) {
        const r = results[0];
        const parts = [r.name, r.district || r.subregion, r.city].filter(Boolean);
        setAddress(parts.join(', ') || 'Location detected');
      }
    } catch {
      setAddress('Location detected');
    }
  }, []);

  const centerMap = useCallback((lat: number, lng: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      600,
    );
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionGranted(false);
        return;
      }
      setPermissionGranted(true);

      // Get first position immediately
      const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy: acc } = initial.coords;
      setCoords({ latitude, longitude });
      setAccuracy(acc ? Math.round(acc) : null);
      setLastUpdated(new Date());
      reverseGeocode(latitude, longitude);
      centerMap(latitude, longitude);

      // Watch for position changes
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 10000 },
        (loc) => {
          const { latitude: lat, longitude: lng, accuracy: acc2 } = loc.coords;
          setCoords({ latitude: lat, longitude: lng });
          setAccuracy(acc2 ? Math.round(acc2) : null);
          setLastUpdated(new Date());
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const handlePingBackend = async () => {
    if (!coords || !authState.user?.id) return;
    setPinging(true);
    try {
      await locationService.getCurrentLocation();
      // Trigger a one-off backend location ping
      const { apiClient } = await import('../../services/apiClient');
      await apiClient.post('/api/delivery-app/location', {
        lat: coords.latitude,
        lng: coords.longitude,
      });
      setLastUpdated(new Date());
    } catch (e) {
      // ignore — not critical
    } finally {
      setPinging(false);
    }
  };

  const formatTime = (d: Date | null) => {
    if (!d) return '--';
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        showsUserLocation={false}
        initialRegion={{
          latitude: 17.385044,
          longitude: 78.486671,
          latitudeDelta: 0.012,
          longitudeDelta: 0.012,
        }}
      >
        {coords && (
          <Marker coordinate={coords} title="Your Location" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.markerContainer}>
              <Animated.View
                style={[styles.markerPulse, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
              />
              <View style={styles.markerDot} />
            </View>
          </Marker>
        )}
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </Pressable>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Live Location</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{address}</Text>
          </View>
          {coords && (
            <Pressable onPress={() => centerMap(coords.latitude, coords.longitude)} style={styles.centerBtn}>
              <MaterialCommunityIcons name="crosshairs-gps" size={22} color={GREEN_PRIMARY} />
            </Pressable>
          )}
        </View>

        {/* Permission denied */}
        {permissionGranted === false && (
          <View style={styles.permissionCard}>
            <MaterialCommunityIcons name="map-marker-off-outline" size={36} color="#F87171" />
            <Text style={styles.permissionTitle}>Location Access Denied</Text>
            <Text style={styles.permissionText}>
              Enable location permission in device settings to use live tracking.
            </Text>
          </View>
        )}

        {/* Loading */}
        {permissionGranted === null && (
          <View style={styles.permissionCard}>
            <ActivityIndicator size="large" color={GREEN_PRIMARY} />
            <Text style={styles.permissionText}>Requesting GPS access...</Text>
          </View>
        )}

        {/* Bottom sheet */}
        {permissionGranted === true && (
          <View style={styles.bottomSheet}>
            <View style={styles.dragHandle} />

            <View style={styles.statusRow}>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveBadgeText}>GPS LIVE</Text>
              </View>
              {accuracy != null && (
                <Text style={styles.accuracyText}>±{accuracy} m accuracy</Text>
              )}
            </View>

            <Text style={styles.addressLine} numberOfLines={2}>{address}</Text>

            {coords && (
              <Text style={styles.coordsLine}>
                {coords.latitude.toFixed(6)}, {coords.longitude.toFixed(6)}
              </Text>
            )}

            <View style={styles.infoGrid}>
              <InfoTile icon="clock-outline" label="Last updated" value={formatTime(lastUpdated)} />
              <InfoTile icon="map-marker-radius-outline" label="Accuracy" value={accuracy ? `${accuracy} m` : '--'} />
            </View>

            <Pressable
              onPress={handlePingBackend}
              disabled={pinging || !coords}
              style={[styles.pingBtn, (pinging || !coords) && { opacity: 0.6 }]}
            >
              {pinging
                ? <ActivityIndicator size="small" color="#fff" />
                : <MaterialCommunityIcons name="send-outline" size={20} color="#fff" />
              }
              <Text style={styles.pingBtnText}>
                {pinging ? 'Sharing...' : 'Share Location with Server'}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

function InfoTile({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={styles.infoTile}>
      <MaterialCommunityIcons name={icon} size={18} color={GREEN_PRIMARY} />
      <Text style={styles.infoTileLabel}>{label}</Text>
      <Text style={styles.infoTileValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GREEN_DARK },
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 20 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(14,138,99,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,138,99,0.3)' },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: GREEN_PRIMARY, fontSize: 12, fontWeight: '700', marginTop: 1 },
  centerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(14,138,99,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(14,138,99,0.3)' },

  // Marker
  markerContainer: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  markerPulse: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: GREEN_PRIMARY },
  markerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: GREEN_PRIMARY, borderWidth: 3, borderColor: '#fff' },

  // Permission/loading card
  permissionCard: { position: 'absolute', top: '35%', left: 20, right: 20, backgroundColor: GREEN_MUTED, borderRadius: 24, padding: 24, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'rgba(14,138,99,0.3)' },
  permissionTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  permissionText: { color: '#7EA98A', fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Bottom sheet
  bottomSheet: { position: 'absolute', bottom: 90, left: 0, right: 0, marginHorizontal: 12, backgroundColor: GREEN_MUTED, borderRadius: 28, padding: 20, paddingBottom: 28, borderWidth: 1, borderColor: 'rgba(14,138,99,0.35)' },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 16 },

  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,138,99,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#22C55E' },
  liveBadgeText: { color: '#22C55E', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  accuracyText: { color: '#7EA98A', fontSize: 11, fontWeight: '700' },

  addressLine: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 4, lineHeight: 22 },
  coordsLine: { color: '#7EA98A', fontSize: 11, fontWeight: '600', marginBottom: 16, fontVariant: ['tabular-nums'] },

  infoGrid: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  infoTile: { flex: 1, backgroundColor: 'rgba(14,138,99,0.12)', borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: 'rgba(14,138,99,0.2)' },
  infoTileLabel: { color: '#7EA98A', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoTileValue: { color: '#fff', fontSize: 13, fontWeight: '800' },

  pingBtn: { backgroundColor: GREEN_PRIMARY, height: 52, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  pingBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
