import SafeScreenWrapper from '@/components/SafeScreenWrapper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, MoreHorizontal, Play, Repeat2, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AdsExampleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ headline?: string; adType?: string }>();
  const headline = params.headline || 'Ojoro';

  return (
    <SafeScreenWrapper>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85} onPress={() => router.back()}>
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.85}>
            <MoreHorizontal size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.coverArt} />

        <Text style={styles.adLabel}>Ads</Text>

        <View style={styles.trackMetaWrap}>
          <Text style={styles.trackTitle} numberOfLines={1}>{headline === 'New Heat out now!!!' ? 'Ojoro' : headline}</Text>
          <Text style={styles.trackArtist}>Sounds of Salem</Text>
        </View>

        <View style={styles.waveRow}>
          {Array.from({ length: 88 }).map((_, idx) => {
            const height = 5 + ((idx * 13) % 44);
            const active = idx <= 44;
            return <View key={idx} style={[styles.waveBar, { height, backgroundColor: active ? '#EC5C39' : '#747578' }]} />;
          })}
        </View>

        <View style={styles.timeRow}>
          <Text style={styles.timeText}>0:15</Text>
          <Text style={styles.timeText}>0:30</Text>
        </View>

        <View style={styles.controlsRow}>
          <Shuffle size={34} color="#D9D9D9" />
          <SkipBack size={30} color="#D9D9D9" />
          <View style={styles.playBtn}>
            <Play size={28} color="#000000" fill="#000000" />
          </View>
          <SkipForward size={30} color="#D9D9D9" />
          <Repeat2 size={34} color="#D9D9D9" />
        </View>

        <View style={styles.sponsoredStrip}>
          <View style={styles.stripLeft}>
            <View style={styles.stripImage} />
            <View style={styles.stripTextWrap}>
              <Text style={styles.sponsored}>Sponsored</Text>
              <Text style={styles.stripHeadline} numberOfLines={1}>New Heat out now!!!</Text>
              <Text style={styles.stripSub} numberOfLines={1}>Check out Wizkid latest single</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.listenBtn} activeOpacity={0.9}>
            <Text style={styles.listenText}>Listen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#140F10' },
  content: { paddingTop: 10, paddingBottom: 120 },
  headerRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  iconBtn: {
    width: 31,
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverArt: {
    alignSelf: 'center',
    width: 334,
    height: 310,
    borderRadius: 12,
    backgroundColor: '#D9D9D9',
  },
  adLabel: {
    marginTop: 8,
    marginLeft: 33,
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  trackMetaWrap: {
    marginTop: 6,
    alignItems: 'center',
    gap: 8,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.5,
  },
  trackArtist: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 14,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  waveRow: {
    marginTop: 28,
    marginHorizontal: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  waveBar: {
    width: 3,
    borderRadius: 80,
  },
  timeRow: {
    marginTop: 16,
    paddingHorizontal: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 15,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  controlsRow: {
    marginTop: 24,
    paddingHorizontal: 27,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playBtn: {
    width: 77,
    height: 77,
    borderRadius: 39,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsoredStrip: {
    marginTop: 16,
    marginHorizontal: 18,
    height: 60,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: 'rgba(236, 92, 57, 0.85)',
    backgroundColor: '#4A4546',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stripLeft: {
    width: '75%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stripImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: '#D9D9D9',
  },
  stripTextWrap: {
    width: 104,
  },
  sponsored: {
    color: 'rgba(236, 92, 57, 0.75)',
    fontFamily: 'Poppins-Medium',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  stripHeadline: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  stripSub: {
    color: 'rgba(255,255,255,0.85)',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
  listenBtn: {
    width: 63,
    height: 23,
    borderRadius: 6,
    backgroundColor: '#EC5C39',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listenText: {
    color: '#FFFFFF',
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 11,
    letterSpacing: -0.5,
  },
});
