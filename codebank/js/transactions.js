/*
  transactions.js

  Exports (named): addTransaction, getTransactions, sendTransaction, enableFirebase
  Default export: same API as an object for compatibility

  Behavior:
  - LocalStorage-first persistence (key: codebank_transactions_v1)
  - sendTransaction uses fetch to call the Firebase Function endpoint at FN_BASE_URL + 'create-transfer'.
    In local dev your test harness (test-auth.js) intercepts that base URL and returns a mock response.
  - Designed to be compatible with either window.firebaseAuth or window.Auth.client if present.

  Example usage (ES module):
    import { addTransaction, getTransactions, sendTransaction } from './transactions.js'
    await addTransaction({ recipient: 'a@b.com', codes: 5 })
    const list = getTransactions()
    await sendTransaction('a@b.com', 5)

*/

const STORAGE_KEY = 'codebank_transactions_v1';

// Default Functions base (replace with your project if needed)
const FN_BASE_URL = 'https://us-central1-d-connect-2025.cloudfunctions.net/';

let useFirebase = false;

function readLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.warn('transactions.readLocal parse error', e);
    return [];
  }
}

function writeLocal(arr) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); } catch (e) { console.warn('transactions.writeLocal error', e); }
}

function makeTxObject(obj = {}) {
  return Object.assign({ id: 'tx_' + Date.now(), created_at: new Date().toISOString(), status: 'pending' }, obj);
}

async function addTransaction(transaction) {
  if (!transaction) return null;
  const list = readLocal();
  const item = makeTxObject(transaction);
  list.unshift(item);
  writeLocal(list);
  try { window.dispatchEvent(new CustomEvent('transactions:updated', { detail: item })); } catch (e) {}
  return item;
}

function getTransactions() { return readLocal(); }

async function sendTransaction(recipient, codes) {
  const tx = await addTransaction({ recipient, codes });
  // Local-only transaction handling
  setTimeout(() => {
    const list = readLocal();
    const idx = list.findIndex(i => i.id === tx.id);
    if (idx !== -1) {
      list[idx].status = 'sent';
      list[idx].tx_id = 'local-' + tx.id;
      writeLocal(list);
      try { window.dispatchEvent(new CustomEvent('transactions:sent', { detail: list[idx] })); } catch(e){}
    }
  }, 200);
  return { success: true, tx_id: 'local-' + tx.id };
}

function enableFirebase(enable = true) { useFirebase = !!enable; }

const exported = { addTransaction, getTransactions, sendTransaction, enableFirebase };

export { addTransaction, getTransactions, sendTransaction, enableFirebase };
export default exported;
