import React from "react";
import { View, StyleSheet, Text, Pressable } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";

const mapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#1a1f2c" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#707070" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a1f2c" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#0E8A63" }] },
  { "featureType": "poi", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#2c3447" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b1" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2f3948" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0A0118" }] }
];

export default function MapScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={mapStyle}
        initialRegion={{
          latitude: 17.385,
          longitude: 78.4867,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        }}
      >
        <Marker
          coordinate={{ latitude: 17.385, longitude: 78.4867 }}
          title="Delivery Location"
        >
           <View style={styles.markerBox}>
              <MaterialCommunityIcons name="map-marker" size={30} color="#0E8A63" />
           </View>
        </Marker>
      </MapView>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
         <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
               <MaterialCommunityIcons name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
               <Text style={styles.headerTitle}>Delivery Route</Text>
               <Text style={styles.headerSub}>Madhapur, Hyderabad</Text>
            </View>
         </View>

         <View style={styles.bottomInfo}>
            <View style={styles.infoRow}>
               <View style={styles.iconCircle}>
                  <MaterialCommunityIcons name="navigation-variant" size={24} color="#0E8A63" />
               </View>
               <View style={{ flex: 1 }}>
                  <Text style={styles.infoTitle}>2.4 km away</Text>
                  <Text style={styles.infoSub}>Estimated time: 12 mins</Text>
               </View>
               <TouchableOpacity style={styles.navBtn}>
                  <Text style={styles.navText}>RE-ROUTE</Text>
               </TouchableOpacity>
            </View>
         </View>
      </SafeAreaView>
    </View>
  );
}

function TouchableOpacity(props: any) {
  const { Pressable } = require("react-native");
  return <Pressable {...props} style={({ pressed }: any) => [props.style, pressed && { opacity: 0.7 }]} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0118" },
  map: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 10 },
  backBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1A0C2E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(112,45,255,0.3)' },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  headerSub: { color: '#0E8A63', fontSize: 12, fontWeight: '700' },
  markerBox: { backgroundColor: '#fff', padding: 8, borderRadius: 20, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  bottomInfo: { backgroundColor: '#1A0C2E', borderRadius: 28, padding: 24, position: 'absolute', bottom: 40, left: 0, right: 0, borderWidth: 1, borderColor: 'rgba(112, 45, 255, 0.15)' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconCircle: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(112, 45, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
  infoTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  infoSub: { color: '#606060', fontSize: 13, fontWeight: '600', marginTop: 2 },
  navBtn: { backgroundColor: 'rgba(112, 45, 255, 0.1)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#0E8A63' },
  navText: { color: '#0E8A63', fontSize: 12, fontWeight: '900' },
});