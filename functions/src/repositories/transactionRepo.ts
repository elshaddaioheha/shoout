/**
 * Transaction repository — marketplace purchase records.
 */

import { COLLECTIONS } from '../types';
import { getDb, DocRef } from './base';

const col = () => getDb().collection(COLLECTIONS.TRANSACTIONS);

export function ref(txnId: string): DocRef {
  return col().doc(txnId);
}

export function query() {
  return col();
}
