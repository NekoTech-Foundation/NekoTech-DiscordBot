const JikanService = require('./utils/jikan/jikanService');

async function runTests() {
    console.log('--- STARTING JIKAN SERVICE STRESS TEST ---');
    console.log('Testing Rate Limiting (Bottleneck) and Caching (Node-Cache)');

    const query = 'Naruto';
    const totalRequests = 5;

    console.log(`\n[Test 1] Making ${totalRequests} rapid requests for "${query}" (Should be queued)...`);

    const startTime = Date.now();
    const promises = [];

    for (let i = 0; i < totalRequests; i++) {
        // We use different queries/pages to force API hits if we want to test rate limit
        // Or same query to test cache.
        // Let's test Cache first: repeated calls.
        promises.push(JikanService.searchAnime(query, 1).then(() => process.stdout.write('.')));
    }

    await Promise.all(promises);
    const timeTaken = Date.now() - startTime;
    console.log(`\n[Test 1] Completed in ${timeTaken}ms.`);
    console.log(`Note: Since these were identical queries, they should have hit the CACHE after the 1st request, completing very fast.`);

    console.log(`\n[Test 2] Testing Rate Limit (Unique Requests)...`);
    // Unique queries to bypass cache and force API calls
    const queries = ['Bleach', 'One Piece', 'Dragon Ball', 'Gintama', 'Fairy Tail'];
    const startTime2 = Date.now();

    try {
        for (const q of queries) {
            process.stdout.write(`Fetching ${q}... `);
            const t0 = Date.now();
            await JikanService.searchAnime(q);
            console.log(`Done (${Date.now() - t0}ms)`);
        }
    } catch (e) {
        console.error('\nERROR:', e.message);
    }

    const timeTaken2 = Date.now() - startTime2;
    console.log(`\n[Test 2] Completed 5 unique requests in ${timeTaken2}ms.`);
    // With 3 req/s (min 400ms delay), 5 requests should take at least ~1600ms if sequential + network time.

    console.log('\n--- VERIFICATION COMPLETE ---');
}

runTests();
