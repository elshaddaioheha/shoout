/**
 * Shoouts – Payment Flow Test (dev)
 * Steps:
 * 1) Create/sign-in test user via Firebase Auth
 * 2) Create checkout session via callable createCheckoutSession
 * 3) Verify checkout session stored
 * 4) Simulate Flutterwave webhook (charge.completed)
 * 5) Verify session completion + transactions + purchases (dev rules needed)
 */

import { readFileSync } from 'fs';
import crypto from 'crypto';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = Object.fromEntries(
	envContent
		.split('\n')
		.filter((l) => l.includes('=') && !l.trim().startsWith('#'))
		.map((l) => {
			const idx = l.indexOf('=');
			return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
		})
);

const PROJECT_ID = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const API_KEY = env.EXPO_PUBLIC_FIREBASE_API_KEY;
const AUTH_DOMAIN = env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || `${PROJECT_ID}.firebaseapp.com`;
const FUNCTIONS_URL = env.EXPO_PUBLIC_FUNCTIONS_URL || `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const FLUTTERWAVE_SECRET_HASH = env.FLUTTERWAVE_SECRET_HASH || env.EXPO_PUBLIC_FLUTTERWAVE_SECRET_KEY || 'test_secret_hash';
const TARGET_ENV = env.APP_ENV || env.EXPO_PUBLIC_ENV || 'development';
const FIREBASE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const NAIRA_RATE = 1600;
const APP_CHECK_DEBUG_TOKEN = env.APP_CHECK_DEBUG_TOKEN || env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN || '';

if (!PROJECT_ID || !API_KEY) {
	throw new Error('Missing EXPO_PUBLIC_FIREBASE_PROJECT_ID or EXPO_PUBLIC_FIREBASE_API_KEY in .env');
}

console.log('🧪 Payment Flow Test (dev)');
console.log('═══════════════════════════════════════════════');
console.log(`Project: ${PROJECT_ID}`);
console.log(`Functions: ${FUNCTIONS_URL}`);
console.log(`Mode: ${TARGET_ENV}`);
if (TARGET_ENV !== 'development') {
	console.warn('⚠️  This script is intended for development/test projects.');
}
console.log();

// Basic Firestore REST helpers (for verification reads)
async function firestoreGet(path, idToken) {
	const url = `${FIREBASE_URL}/${path}?key=${API_KEY}`;
	const headers = {};
	if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
	const res = await fetch(url, { headers });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GET ${path} failed: ${text}`);
	}
	return res.json();
}

async function firestoreRunQuery(query, idToken) {
	const url = `${FIREBASE_URL}:runQuery?key=${API_KEY}`;
	const headers = { 'Content-Type': 'application/json' };
	if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
	const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(query) });
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`runQuery failed: ${text}`);
	}
	return res.json();
}

// Step 1: user setup via Identity Toolkit REST (avoids browser auth in Node)
async function setupTestUser() {
	console.log('📝 Step 1: Setting up test user...');
	const testEmail = `test-payment-${Date.now()}@test.local`;
	const testPassword = 'TestPassword123!';

	const signupUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
	const signinUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;

	try {
		const signupRes = await fetch(signupUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
		});
		const signupData = await signupRes.json();
		if (signupRes.ok && signupData.idToken) {
			console.log(`   ✓ Test user created: ${signupData.localId}`);
			await verifyIdToken(signupData.idToken);
			return { uid: signupData.localId, idToken: signupData.idToken };
		}

		if (signupData.error?.message?.includes('EMAIL_EXISTS')) {
			console.log('   ℹ Email exists, signing in...');
			const signinRes = await fetch(signinUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: testEmail, password: testPassword, returnSecureToken: true }),
			});
			const signinData = await signinRes.json();
			if (signinRes.ok && signinData.idToken) {
				console.log(`   ✓ Test user signed in: ${signinData.localId}`);
				await verifyIdToken(signinData.idToken);
				return { uid: signinData.localId, idToken: signinData.idToken };
			}
			throw new Error(signinData.error?.message || 'signIn failed');
		}

		throw new Error(signupData.error?.message || 'signUp failed');
	} catch (err) {
		console.error('   ✗ Auth failed:', err?.message || err);
		process.exit(1);
	}
}

async function verifyIdToken(idToken) {
	const url = `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`;
	const res = await fetch(url, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ idToken }),
	});
	const data = await res.json();
	if (!res.ok) {
		console.warn('   ⓘ idToken lookup failed:', data?.error?.message || JSON.stringify(data));
		return false;
	}
	console.log('   ✓ idToken verified (accounts:lookup)');
	return true;
}

// Step 2: create checkout via callable (HTTP with bearer token)
async function createCheckoutSession(userId, idToken, beatId = 'beat-001', uploaderId = 'uploader-1') {
	console.log('\n📦 Step 2: Creating checkout session (callable)...');
	const items = [
		{
			id: beatId,
			title: 'Cyber Beats',
			artist: 'Test Artist',
			price: 50,
			uploaderId,
			audioUrl: `gs://bucket/originals/${uploaderId}/${beatId}.wav`,
			coverUrl: `gs://bucket/covers/${beatId}.jpg`,
		},
	];
	const totalAmountUsd = 50;

	try {
		const res = await fetch(`${FUNCTIONS_URL}/createCheckoutSession`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${idToken}`,
				...(APP_CHECK_DEBUG_TOKEN ? { 'X-Firebase-AppCheck': APP_CHECK_DEBUG_TOKEN } : {}),
			},
			body: JSON.stringify({ data: { items, totalAmountUsd } }),
		});

		const payload = await res.json();
		if (!res.ok) {
			const msg = payload?.error?.message || JSON.stringify(payload);
			throw new Error(`status ${res.status} ${res.statusText} -> ${msg}`);
		}

		const { txRef, amountNgn } = payload?.result || payload;
		if (!txRef || !amountNgn) throw new Error(`Unexpected response: ${JSON.stringify(payload)}`);

		console.log('   ✓ Checkout session created');
		console.log(`   • txRef: ${txRef}`);
		console.log(`   • Amount: ₦${amountNgn} (${totalAmountUsd} USD)`);
		console.log(`   • Items: ${items.length}`);
		return { txRef, amountNgn, items };
	} catch (err) {
		console.error('   ✗ Callable failed:', err?.message || err);
		console.error('   ⓘ Ensure Functions URL points to dev and auth/App Check allow this call.');
		process.exit(1);
	}
}

// Step 3: verify checkout exists
async function verifyCheckoutSessionExists(txRef, idToken) {
	console.log('\n✅ Step 3: Verifying checkout session...');
	try {
		const data = await firestoreGet(`checkoutSessions/${txRef}`, idToken);
		const status = data.fields?.status?.stringValue || '';
		const totalAmountNgn = parseInt(data.fields?.totalAmountNgn?.integerValue || 0);
		const itemCount = data.fields?.items?.arrayValue?.values?.length || 0;
		console.log('   ✓ Checkout session found');
		console.log(`   • Status: ${status}`);
		console.log(`   • Amount: ₦${totalAmountNgn}`);
		console.log(`   • Items: ${itemCount}`);
		return { status, totalAmountNgn, itemCount };
	} catch (err) {
		console.error('   ✗ Verification failed:', err?.message || err);
		process.exit(1);
	}
}

// Step 4: simulate webhook
async function simulateFlutterwaveWebhook(txRef, amountNgn) {
	console.log('\n🌐 Step 4: Simulating Flutterwave webhook...');
	const payload = {
		event: 'charge.completed',
		data: {
			id: 'flw_' + Date.now(),
			tx_ref: txRef,
			amount: amountNgn,
			currency: 'NGN',
			status: 'successful',
			payment_type: 'card',
			customer: {
				email: 'buyer@example.com',
				name: 'Test Buyer',
			},
		},
	};

	const rawBody = JSON.stringify(payload);
	const signature = crypto.createHmac('sha256', FLUTTERWAVE_SECRET_HASH).update(rawBody).digest('hex');

	try {
		const res = await fetch(`${FUNCTIONS_URL}/flutterwaveWebhook`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'verif-hash': signature,
			},
			body: rawBody,
		});
		if (!res.ok) {
			const text = await res.text();
			throw new Error(`Webhook failed (${res.status}): ${text}`);
		}
		console.log('   ✓ Webhook processed');
		console.log(`   • Provider Tx: ${payload.data.id}`);
		return payload;
	} catch (err) {
		console.error('   ✗ Webhook failed:', err?.message || err);
		process.exit(1);
	}
}

// Step 5: verify completion
async function verifyCheckoutSessionCompleted(txRef, idToken) {
	console.log('\n✅ Step 5: Verifying checkout completion...');
	await new Promise((r) => setTimeout(r, 1200));
	try {
		const data = await firestoreGet(`checkoutSessions/${txRef}`, idToken);
		const status = data.fields?.status?.stringValue || '';
		const paidAmount = parseInt(data.fields?.paidAmount?.integerValue || 0);
		const providerTransactionId = data.fields?.providerTransactionId?.stringValue || '';
		if (status !== 'completed') throw new Error(`Expected completed, got ${status}`);
		console.log('   ✓ Checkout completed');
		console.log(`   • Paid: ₦${paidAmount}`);
		console.log(`   • Provider Tx: ${providerTransactionId}`);
		return { status, paidAmount, providerTransactionId };
	} catch (err) {
		console.error('   ✗ Completion check failed:', err?.message || err);
		process.exit(1);
	}
}

// Step 6: verify transactions
async function verifyTransactionsCreated(buyerId, idToken) {
	console.log('\n💳 Step 6: Verifying transactions...');
	try {
		const query = {
			structuredQuery: {
				from: [{ collectionId: 'transactions' }],
				where: {
					fieldFilter: {
						field: { fieldPath: 'buyerId' },
						op: 'EQUAL',
						value: { stringValue: buyerId },
					},
				},
			},
		};
		const results = await firestoreRunQuery(query, idToken);
		const transactions = (results || [])
			.filter((r) => r.document)
			.map((r) => {
				const f = r.document.fields;
				return {
					id: r.document.name.split('/').pop(),
					trackId: f.trackId?.stringValue || '',
					amount: parseInt(f.amount?.integerValue || 0),
					status: f.status?.stringValue || '',
				};
			});
		if (!transactions.length) {
			console.log('   ⓘ No transactions found (may be blocked by rules)');
		} else {
			console.log(`   ✓ ${transactions.length} transaction(s) found`);
			transactions.forEach((t, i) => {
				console.log(`   ${i + 1}. Track: ${t.trackId} | Amount: ₦${t.amount} | Status: ${t.status}`);
			});
		}
		return transactions;
	} catch (err) {
		console.error('   ✗ Transaction query failed:', err?.message || err);
		console.error('   ⓘ Relax dev rules or use emulator to inspect transactions.');
		return [];
	}
}

// Step 7: verify user purchases
async function verifyUserPurchase(userId, beatId, idToken) {
	console.log('\n📚 Step 7: Verifying user purchases...');
	try {
		const query = {
			structuredQuery: {
				from: [{ collectionId: 'purchases', allDescendants: false }],
				where: {
					fieldFilter: {
						field: { fieldPath: 'trackId' },
						op: 'EQUAL',
						value: { stringValue: beatId },
					},
				},
			},
		};
		const url = `${FIREBASE_URL}/users/${userId}/purchases:runQuery?key=${API_KEY}`;
		const headers = { 'Content-Type': 'application/json' };
		if (idToken) headers['Authorization'] = `Bearer ${idToken}`;
		const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(query) });
		const results = await res.json();
		const purchases = (results || [])
			.filter((r) => r.document)
			.map((r) => {
				const f = r.document.fields;
				return {
					id: r.document.name.split('/').pop(),
					trackId: f.trackId?.stringValue || '',
					title: f.title?.stringValue || '',
					artist: f.artist?.stringValue || '',
					price: parseInt(f.price?.integerValue || 0),
				};
			});
		if (!purchases.length) {
			console.log('   ⓘ No purchases found (may be blocked by rules)');
		} else {
			console.log(`   ✓ ${purchases.length} purchase(s) found`);
			purchases.forEach((p, i) => {
				console.log(`   ${i + 1}. ${p.title} by ${p.artist} | ₦${p.price}`);
			});
		}
		return purchases;
	} catch (err) {
		console.error('   ✗ Purchase query failed:', err?.message || err);
		return [];
	}
}

async function main() {
	try {
		const { uid, idToken } = await setupTestUser();
		const { txRef, amountNgn, items } = await createCheckoutSession(uid, idToken);
		await verifyCheckoutSessionExists(txRef, idToken);
		await simulateFlutterwaveWebhook(txRef, amountNgn);
		await verifyCheckoutSessionCompleted(txRef, idToken);
		await verifyTransactionsCreated(uid, idToken);
		await verifyUserPurchase(uid, items[0].id, idToken);

		console.log('\n═══════════════════════════════════════════════');
		console.log('✅ Payment flow test finished');
		console.log(`• txRef: ${txRef}`);
		console.log('• Check Firestore for detailed records');
	} catch (err) {
		console.error('\n❌ Test failed:', err?.message || err);
		process.exit(1);
	}
}

main();
