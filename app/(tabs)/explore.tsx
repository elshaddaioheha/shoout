// This screen is intentionally hidden (href: null in _layout.tsx).
import { StyleSheet, Text, View } from 'react-native';

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Explore placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#140F10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Poppins-Regular',
    fontSize: 16,
  },
});
