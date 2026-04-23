import fs from 'fs';
import path from 'path';

const LEDGER = path.join(process.cwd(), 'uploads/piccarboon/ledger.json');

export function recordTransaction(entry) {
  let data = [];
  if (fs.existsSync(LEDGER)) {
    data = JSON.parse(fs.readFileSync(LEDGER));
  }
  data.push({ ...entry, at: Date.now() });
  fs.writeFileSync(LEDGER, JSON.stringify(data, null, 2));
}