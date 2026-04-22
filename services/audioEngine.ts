import { Platform } from 'react-native';
import type { AudioPlaybackState, AudioProgress, AudioSubscription, TrackOptions } from './audioEngine.types';

type AudioEngineModule = {
	audioEngine: {
		setup: () => Promise<void>;
		load: (track: TrackOptions, autoPlay?: boolean) => Promise<void>;
		play: () => Promise<void>;
		pause: () => Promise<void>;
		stop: () => Promise<void>;
		unload: () => Promise<void>;
		seek: (positionMs: number) => Promise<void>;
		setVolume: (volume: number) => Promise<void>;
		onPlaybackStateChange: (callback: (state: AudioPlaybackState) => void) => AudioSubscription;
		onPlaybackProgressChange: (callback: (progress: AudioProgress) => void) => AudioSubscription;
		onPlaybackQueueEnded: (callback: (event: any) => void) => AudioSubscription;
	};
};

const noopSubscription: AudioSubscription = {
	remove: () => {
		// no-op
	},
};

const fallbackAudioEngine: AudioEngineModule['audioEngine'] = {
	async setup() {
		// no-op
	},
	async load() {
		throw new Error('Audio engine unavailable.');
	},
	async play() {
		throw new Error('Audio engine unavailable.');
	},
	async pause() {
		// no-op
	},
	async stop() {
		// no-op
	},
	async unload() {
		// no-op
	},
	async seek() {
		// no-op
	},
	async setVolume() {
		// no-op
	},
	onPlaybackStateChange() {
		return noopSubscription;
	},
	onPlaybackProgressChange() {
		return noopSubscription;
	},
	onPlaybackQueueEnded() {
		return noopSubscription;
	},
};

let resolvedAudioEngine: AudioEngineModule['audioEngine'] | null = null;

function resolveAudioEngine(): AudioEngineModule['audioEngine'] {
	try {
		const module = (Platform.OS === 'web'
			? require('./audioEngine.web')
			: require('./audioEngine.native')) as AudioEngineModule;
		return module.audioEngine;
	} catch (error) {
		console.error('[audioEngine] Failed to load platform audio engine:', error);
		return fallbackAudioEngine;
	}
}

function getAudioEngine(): AudioEngineModule['audioEngine'] {
	if (!resolvedAudioEngine) {
		resolvedAudioEngine = resolveAudioEngine();
	}

	return resolvedAudioEngine;
}

export const audioEngine: AudioEngineModule['audioEngine'] = {
	setup: () => getAudioEngine().setup(),
	load: (track: TrackOptions, autoPlay?: boolean) => getAudioEngine().load(track, autoPlay),
	play: () => getAudioEngine().play(),
	pause: () => getAudioEngine().pause(),
	stop: () => getAudioEngine().stop(),
	unload: () => getAudioEngine().unload(),
	seek: (positionMs: number) => getAudioEngine().seek(positionMs),
	setVolume: (volume: number) => getAudioEngine().setVolume(volume),
	onPlaybackStateChange: (callback: (state: AudioPlaybackState) => void) => getAudioEngine().onPlaybackStateChange(callback),
	onPlaybackProgressChange: (callback: (progress: AudioProgress) => void) => getAudioEngine().onPlaybackProgressChange(callback),
	onPlaybackQueueEnded: (callback: (event: any) => void) => getAudioEngine().onPlaybackQueueEnded(callback),
};
export type { AudioPlaybackState, AudioProgress, AudioSubscription, TrackOptions };

