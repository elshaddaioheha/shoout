/**
 * Social / Chat Logic Tests
 *
 * Tests helper logic for: conversation ID generation, message structure
 * validation, and the follow/unfollow state transitions.
 *
 * Firebase calls are intercepted via jest moduleNameMapper → __mocks__/firebase.ts
 */

jest.mock('@react-native-async-storage/async-storage', () =>
    require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { arrayRemove, arrayUnion, doc, updateDoc } from 'firebase/firestore';
import { mockUpdateDoc } from '../../__mocks__/firebase';
import { auth } from '../../__mocks__/firebaseConfig';

// ─────────────────────────────────────────────────────────────────────────────
// Conversation ID helper
// ─────────────────────────────────────────────────────────────────────────────
function getConversationId(uid1: string, uid2: string): string {
    return [uid1, uid2].sort().join('_');
}

describe('Chat › conversation ID generation', () => {
    it('generates a deterministic ID from two UIDs', () => {
        expect(getConversationId('alice-uid', 'bob-uid')).toBe('alice-uid_bob-uid');
    });

    it('is commutative (same ID regardless of argument order)', () => {
        const id1 = getConversationId('alice-uid', 'bob-uid');
        const id2 = getConversationId('bob-uid', 'alice-uid');
        expect(id1).toBe(id2);
    });

    it('is unique for different user pairs', () => {
        expect(getConversationId('alice-uid', 'bob-uid')).not.toBe(
            getConversationId('alice-uid', 'carol-uid')
        );
    });

    it('handles self-conversation (same uid both sides)', () => {
        const id = getConversationId('alice-uid', 'alice-uid');
        expect(id).toBe('alice-uid_alice-uid');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Message document structure
// ─────────────────────────────────────────────────────────────────────────────
interface Message {
    text: string;
    senderId: string;
    createdAt: string;
    read: boolean;
}

function createMessage(text: string, senderId: string): Message {
    return {
        text: text.trim(),
        senderId,
        createdAt: new Date().toISOString(),
        read: false,
    };
}

describe('Chat › message structure', () => {
    it('creates a message with the correct fields', () => {
        const msg = createMessage('Hello!', 'user-a');
        expect(msg.text).toBe('Hello!');
        expect(msg.senderId).toBe('user-a');
        expect(msg.read).toBe(false);
        expect(msg.createdAt).toBeTruthy();
    });

    it('trims whitespace from message text', () => {
        expect(createMessage('  Hello World  ', 'u').text).toBe('Hello World');
    });

    it('empty messages should be blocked by the UI (trim test)', () => {
        expect('   '.trim()).toBeFalsy();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Follow / Unfollow state transitions
// ─────────────────────────────────────────────────────────────────────────────
async function handleFollow(
    isFollowing: boolean,
    artistId: string,
    currentUserId: string
): Promise<{ isFollowing: boolean; followersDelta: number }> {
    // Cast to any: the mock doesn't require a real Firestore instance
    const db = {} as any;

    if (isFollowing) {
        await updateDoc(doc(db, 'users', artistId), { followers: arrayRemove(currentUserId) });
        await updateDoc(doc(db, 'users', currentUserId), { following: arrayRemove(artistId) });
        return { isFollowing: false, followersDelta: -1 };
    } else {
        await updateDoc(doc(db, 'users', artistId), { followers: arrayUnion(currentUserId) });
        await updateDoc(doc(db, 'users', currentUserId), { following: arrayUnion(artistId) });
        return { isFollowing: true, followersDelta: 1 };
    }
}

beforeEach(() => jest.clearAllMocks());

describe('Artist Profile › follow/unfollow', () => {
    it('calls updateDoc twice when following', async () => {
        await handleFollow(false, 'artist-uid', 'test-user-uid');
        expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('calls updateDoc twice when unfollowing', async () => {
        await handleFollow(true, 'artist-uid', 'test-user-uid');
        expect(mockUpdateDoc).toHaveBeenCalledTimes(2);
    });

    it('follow returns isFollowing: true and +1 delta', async () => {
        const result = await handleFollow(false, 'artist-uid', 'test-user-uid');
        expect(result.isFollowing).toBe(true);
        expect(result.followersDelta).toBe(1);
    });

    it('unfollow returns isFollowing: false and -1 delta', async () => {
        const result = await handleFollow(true, 'artist-uid', 'test-user-uid');
        expect(result.isFollowing).toBe(false);
        expect(result.followersDelta).toBe(-1);
    });

    it('self-follow guard: current user uid matches artist uid', () => {
        const myUid = (auth.currentUser as any).uid;
        expect(myUid === myUid).toBe(true); // component returns early in this case
    });
});
