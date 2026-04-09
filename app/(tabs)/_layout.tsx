import { Tabs, useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { StatusBar } from "expo-status-bar";

const { width } = Dimensions.get("window");


export default function TabsLayout() {
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: "#0E8A63",
          tabBarInactiveTintColor: "#94A3B8",
          tabBarStyle: {
            height: 75,
            backgroundColor: "#FFFFFF",
            borderTopWidth: 1,
            borderTopColor: '#F1F5F9',
            elevation: 20,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.05,
            shadowRadius: 15,
            paddingBottom: 15,
            paddingTop: 10,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '900',
            marginTop: -4,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name={focused ? "home" : "home-outline"} size={24} color={color} />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="earnings"
          options={{
            title: "Earnings",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name={focused ? "wallet" : "wallet-outline"} size={24} color={color} />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="location"
          options={{
            title: "",
            tabBarButton: (navProps: any) => (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/location")}
                activeOpacity={0.9}
                style={[navProps.style, styles.floatingCenterBtn]}
              >
                <View style={styles.gradientBtn}>
                   <MaterialCommunityIcons name="map-marker-radius" size={26} color="#fff" />
                </View>
              </TouchableOpacity>
            ),
          }}
        />

        <Tabs.Screen
          name="orders"
          options={{
            title: "Tasks",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name={focused ? "clipboard-text" : "clipboard-text-outline"} size={24} color={color} />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: "Account",
            tabBarIcon: ({ color, focused }) => (
              <View style={{ alignItems: 'center' }}>
                <MaterialCommunityIcons name={focused ? "account" : "account-outline"} size={24} color={color} />
                {focused && <View style={styles.indicator} />}
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  floatingCenterBtn: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 64,
    height: 64,
  },
  gradientBtn: {
    width: 60,
    height: 60,
    borderRadius: 22,
    backgroundColor: '#0E8A63',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#0E8A63",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  indicator: {
    width: 6,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0E8A63',
    marginTop: 4,
    shadowColor: '#0E8A63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  }
});