const { initDictionary, checkWord } = require('./vocabApi');

async function test() {
    console.log('🧪 Starting verification...');

    // Initialize DB
    await initDictionary();

    // Test Cases
    const cases = [
        { word: 'con mèo', expected: true, desc: 'Valid 2-word phrase (con mèo)' },
        { word: 'a ba giua', expected: false, desc: 'Invalid 3-word phrase' },
        { word: 'mèo', expected: false, desc: 'Invalid 1-word phrase' },
        { word: 'không tồn tại', expected: false, desc: 'Non-existent phrase' }
    ];

    let passed = 0;

    for (const c of cases) {
        process.stdout.write(`Testing "${c.word}" (${c.desc})... `);
        const result = await checkWord(c.word);

        if (result === c.expected) {
            console.log('✅ PASS');
            passed++;
        } else {
            console.log(`❌ FAIL (Expected ${c.expected}, got ${result})`);
        }
    }

    console.log(`\n📊 Result: ${passed}/${cases.length} passed.`);
    if (passed === cases.length) {
        console.log('✨ Verification Successful!');
    } else {
        console.warn('⚠️ Verification Failed! NoiTu dictionary may not work correctly.');
    }
}

test();
