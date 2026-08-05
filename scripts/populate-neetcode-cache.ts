import fs from 'fs';

const bundle = fs.readFileSync('scripts/neetcode.io_practice_practice_allNC_files/main.ffd63418e32da958.js', 'utf8');

// Match everything that looks like a problem object
const regex = /{problem:"([^"]+)"(?:[^{}]*?)link:"([^"]+)"(?:[^{}]*?)(?:ncLink:"([^"]+)")?[^{}]*}/g;

const mappings: Record<string, string> = {};
let match;
let count = 0;

while ((match = regex.exec(bundle)) !== null) {
    count++;
    const problemName = match[1];
    let lcLink = match[2];
    let ncLink = match[3];

    lcLink = lcLink.replace(/\/$/, ''); // Remove trailing slash
    
    if (ncLink) {
        ncLink = ncLink.replace(/\/$/, '');
        mappings[lcLink] = `https://neetcode.io/problems/${ncLink}`;
    } else {
        // If ncLink is absent, Neetcode uses the leetcode slug? Wait, let's just save the leetcode slug or ignore it if there is no ncLink.
        // Actually, on neetcode.io, some problems are missing ncLink because they don't have a neetcode specific page, or their neetcode link is the same as leetcode.
        // Let's assume if it's in this list, it has a neetcode link which is the same as the leetcode slug.
        mappings[lcLink] = `https://neetcode.io/problems/${lcLink}`;
    }
}

console.log(`Found ${count} problem objects.`);
console.log(`Extracted ${Object.keys(mappings).length} mappings.`);
fs.writeFileSync('data/neetcode-cache.json', JSON.stringify(mappings, null, 2));
console.log("Wrote mappings to data/neetcode-cache.json");

