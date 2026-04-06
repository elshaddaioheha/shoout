import { useRouter } from 'expo-router';
import { useAppTheme } from '@/hooks/use-app-theme';
import { adaptLegacyStyles } from '@/utils/legacyThemeAdapter';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function useModalStyles() {
  const appTheme = useAppTheme();
  return StyleSheet.create(adaptLegacyStyles(legacyStyles, appTheme) as any);
}

export default function ModalScreen() {
  const styles = useModalStyles();

  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modal</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.dismiss}>Dismiss</Text>
      </TouchableOpacity>
    </View>
  );
}

const legacyStyles = {
  container: {
    flex: 1,
    backgroundColor: '#140F10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    color: '#FFF',
    fontFamily: 'Poppins-Bold',
    marginBottom: 16,
  },
  dismiss: {
    fontSize: 15,
    color: '#EC5C39',
    fontFamily: 'Poppins-SemiBold',
  },
};
