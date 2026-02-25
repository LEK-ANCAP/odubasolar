import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hooksDir = path.join(__dirname, '../hooks');

const files = [
    'use-ui-store.ts', 'use-sync-store.ts', 'use-settings-store.ts',
    'use-quotes-store.ts', 'use-providers-store.ts', 'use-kits-store.ts',
    'use-invoices-store.ts', 'use-inventory-store.ts', 'use-customers-store.ts',
    'use-budgets-store.ts', 'use-accounts-store.ts'
];

for (const file of files) {
    const filePath = path.join(hooksDir, file);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    if (!content.includes('idbStorage')) {
        content = content.replace(/import\s+{\s*persist\s*}\s+from\s+['"]zustand\/middleware['"]/, "import { persist, createJSONStorage } from 'zustand/middleware'\nimport { idbStorage } from '@/lib/idb-storage'");

        // Replace name: 'xyz', with name: 'xyz', storage: createJSONStorage(() => idbStorage),
        const names = ['ui-settings', 'sync-queue-storage', 'settings-storage', 'quotes-storage', 'providers-storage', 'kits-storage', 'invoices-storage', 'inventory-storage', 'customers-storage', 'budgets-storage', 'accounts-storage'];

        for (const name of names) {
            const regex = new RegExp(`name:\\s*['"]${name}['"],?`);
            if (regex.test(content)) {
                content = content.replace(regex, `name: '${name}',\n            storage: createJSONStorage(() => idbStorage),`);
                break; // Only one match per file
            }
        }

        fs.writeFileSync(filePath, content);
        console.log(`Updated ${file}`);
    }
}
console.log('All done!');
