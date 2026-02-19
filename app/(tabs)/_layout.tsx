import { Tabs } from 'expo-router';
import React from 'react';
import { View, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { Home, Search, ShoppingCart, Compass, MoreVertical } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#EC5C39',
        tabBarInactiveTintColor: '#FFFFFF',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#140F10',
          borderTopColor: 'rgba(0,0,0,0.1)',
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Poppins-Regular',
          fontSize: 10,
          display: 'none', // Matching user mock with no labels
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home size={24} color={color} fill={color === '#EC5C39' ? '#EC5C39' : 'none'} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color }) => <Search size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="studio"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color }) => <ShoppingCart size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <View style={styles.exploreWrapper}>
              <Compass size={24} color={color} />
              <TouchableOpacity style={styles.moreButton}>
                <MoreVertical size={24} color="white" />
              </TouchableOpacity>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  exploreWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40, // Space between Explore and More
  },
  moreButton: {
    padding: 4,
  }
});
