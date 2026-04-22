const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

/**
 * Translation Validation Tool
 * Validates completeness and consistency across all language files
 */

const LANG_DIR = path.join(__dirname, '..', 'lang');
const MUSIC_LANG_DIR = path.join(__dirname, 'Music', 'languages');
const SUPPORTED_LANGS = ['vn', 'en', 'jp'];
const BASE_LANG = 'vn'; // Vietnamese is the most complete

class TranslationValidator {
    constructor() {
        this.languages = {};
        this.musicLanguages = {};
        this.issues = {
            missingKeys: {},
            orphanedKeys: {},
            placeholderMismatches: [],
            emptyValues: [],
            formatErrors: []
        };
    }

    /**
     * Load all language files
     */
    loadLanguageFiles() {
        console.log('📂 Loading language files...\n');

        // Load main YAML language files
        for (const lang of SUPPORTED_LANGS) {
            const filePath = path.join(LANG_DIR, `${lang}.yml`);
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                this.languages[lang] = yaml.load(content);
                console.log(`✅ Loaded ${lang}.yml (${Object.keys(this.languages[lang]).length} top-level keys)`);
            } catch (error) {
                console.error(`❌ Error loading ${lang}.yml:`, error.message);
                this.issues.formatErrors.push({ file: `${lang}.yml`, error: error.message });
            }
        }

        // Load Music JSON language files
        const musicFiles = ['vi.json', 'en.json', 'ja.json'];
        for (const file of musicFiles) {
            const filePath = path.join(MUSIC_LANG_DIR, file);
            const langCode = file.replace('.json', '');
            try {
                const content = fs.readFileSync(filePath, 'utf8');
                this.musicLanguages[langCode] = JSON.parse(content);
                console.log(`✅ Loaded Music/${file} (${Object.keys(this.musicLanguages[langCode]).length} top-level keys)`);
            } catch (error) {
                console.error(`❌ Error loading Music/${file}:`, error.message);
                this.issues.formatErrors.push({ file: `Music/${file}`, error: error.message });
            }
        }

        console.log('');
    }

    /**
     * Get all keys from nested object (flatten)
     */
    getAllKeys(obj, prefix = '') {
        let keys = [];

        for (const key in obj) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys = keys.concat(this.getAllKeys(obj[key], fullKey));
            } else {
                keys.push(fullKey);
            }
        }

        return keys;
    }

    /**
     * Get value from nested object using dot notation
     */
    getNestedValue(obj, key) {
        return key.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    /**
     * Extract placeholders from string
     */
    extractPlaceholders(str) {
        if (typeof str !== 'string') return [];
        const matches = str.match(/\{(\w+)\}/g);
        return matches ? matches.map(m => m.slice(1, -1)) : [];
    }

    /**
     * Check for missing translations
     */
    checkMissingTranslations() {
        console.log('🔍 Checking for missing translations...\n');

        const baseKeys = this.getAllKeys(this.languages[BASE_LANG]);

        for (const lang of SUPPORTED_LANGS) {
            if (lang === BASE_LANG) continue;

            const langKeys = this.getAllKeys(this.languages[lang]);
            const missingKeys = baseKeys.filter(key => !langKeys.includes(key));

            if (missingKeys.length > 0) {
                this.issues.missingKeys[lang] = missingKeys;
                console.log(`${lang.toUpperCase()}: Missing ${missingKeys.length} keys compared to ${BASE_LANG.toUpperCase()}`);
            } else {
                console.log(`${lang.toUpperCase()}: All keys present`);
            }
        }

        console.log('');
    }

    /**
     * Check for orphaned keys (exist in other langs but not in base)
     */
    checkOrphanedKeys() {
        console.log('🔍 Checking for orphaned keys...\n');

        const baseKeys = this.getAllKeys(this.languages[BASE_LANG]);

        for (const lang of SUPPORTED_LANGS) {
            if (lang === BASE_LANG) continue;

            const langKeys = this.getAllKeys(this.languages[lang]);
            const orphanedKeys = langKeys.filter(key => !baseKeys.includes(key));

            if (orphanedKeys.length > 0) {
                this.issues.orphanedKeys[lang] = orphanedKeys;
                console.log(`⚠️  ${lang.toUpperCase()}: ${orphanedKeys.length} orphaned keys (not in ${BASE_LANG.toUpperCase()})`);
            }
        }

        console.log('');
    }

    /**
     * Check placeholder consistency
     */
    checkPlaceholders() {
        console.log('🔍 Checking placeholder consistency...\n');

        const baseKeys = this.getAllKeys(this.languages[BASE_LANG]);
        let issues = 0;

        for (const key of baseKeys) {
            const baseValue = this.getNestedValue(this.languages[BASE_LANG], key);
            const basePlaceholders = this.extractPlaceholders(baseValue);

            if (basePlaceholders.length === 0) continue;

            for (const lang of SUPPORTED_LANGS) {
                if (lang === BASE_LANG) continue;

                const langValue = this.getNestedValue(this.languages[lang], key);
                if (!langValue) continue; // Skip if key is missing (already reported)

                const langPlaceholders = this.extractPlaceholders(langValue);

                // Check if placeholders match
                const basePlaceholdersSet = new Set(basePlaceholders);
                const langPlaceholdersSet = new Set(langPlaceholders);

                const missing = basePlaceholders.filter(p => !langPlaceholdersSet.has(p));
                const extra = langPlaceholders.filter(p => !basePlaceholdersSet.has(p));

                if (missing.length > 0 || extra.length > 0) {
                    this.issues.placeholderMismatches.push({
                        key,
                        lang,
                        missing,
                        extra,
                        base: baseValue,
                        translation: langValue
                    });
                    issues++;
                }
            }
        }

        if (issues > 0) {
            console.log(`❌ Found ${issues} placeholder mismatches`);
        } else {
            console.log('✅ All placeholders are consistent');
        }

        console.log('');
    }

    /**
     * Check for empty values
     */
    checkEmptyValues() {
        console.log('🔍 Checking for empty values...\n');

        for (const lang of SUPPORTED_LANGS) {
            const keys = this.getAllKeys(this.languages[lang]);

            for (const key of keys) {
                const value = this.getNestedValue(this.languages[lang], key);

                if (value === '' || value === null || value === undefined) {
                    this.issues.emptyValues.push({ lang, key });
                }
            }
        }

        if (this.issues.emptyValues.length > 0) {
            console.log(`❌ Found ${this.issues.emptyValues.length} empty values`);
        } else {
            console.log('✅ No empty values found');
        }

        console.log('');
    }

    /**
     * Check Music language system
     */
    checkMusicSystem() {
        console.log('🔍 Checking Music language system...\n');

        // Check if Japanese is missing
        if (!this.musicLanguages['ja'] && !this.musicLanguages['jp']) {
            console.log('❌ Music system is missing Japanese language support');
        } else {
            console.log('✅ Music Japanese language support detected');
        }

        // Check if vi and en have same keys
        if (this.musicLanguages['vi'] && this.musicLanguages['en']) {
            const viKeys = this.getAllKeys(this.musicLanguages['vi']);
            const enKeys = this.getAllKeys(this.musicLanguages['en']);

            const missingInEn = viKeys.filter(key => !enKeys.includes(key));
            const missingInVi = enKeys.filter(key => !viKeys.includes(key));

            if (missingInEn.length > 0) {
                console.log(`❌ Music EN missing ${missingInEn.length} keys from VI`);
            }
            if (missingInVi.length > 0) {
                console.log(`❌ Music VI missing ${missingInVi.length} keys from EN`);
            }
            if (missingInEn.length === 0 && missingInVi.length === 0) {
                console.log('✅ Music VI and EN have matching keys');
            }
        }

        // Check if vi and ja have same keys
        if (this.musicLanguages['vi'] && this.musicLanguages['ja']) {
            const viKeys = this.getAllKeys(this.musicLanguages['vi']);
            const jaKeys = this.getAllKeys(this.musicLanguages['ja']);

            const missingInJa = viKeys.filter(key => !jaKeys.includes(key));
            const missingInVi = jaKeys.filter(key => !viKeys.includes(key));

            if (missingInJa.length > 0) {
                console.log(`❌ Music JA missing ${missingInJa.length} keys from VI`);
            }
            if (missingInVi.length > 0) {
                console.log(`❌ Music VI missing ${missingInVi.length} keys from JA`);
            }
            if (missingInJa.length === 0 && missingInVi.length === 0) {
                console.log('✅ Music VI and JA have matching keys');
            }
        }

        console.log('⚠️  Music system uses separate JSON files instead of unified YAML system');
        console.log('');
    }

    /**
     * Generate detailed report
     */
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 TRANSLATION VALIDATION REPORT');
        console.log('='.repeat(80) + '\n');

        // Summary
        console.log('📈 SUMMARY\n');
        console.log(`Languages: ${SUPPORTED_LANGS.join(', ')}`);
        console.log(`Base language: ${BASE_LANG.toUpperCase()}`);
        console.log(`Total keys in ${BASE_LANG.toUpperCase()}: ${this.getAllKeys(this.languages[BASE_LANG]).length}\n`);

        // Coverage
        console.log('📊 COVERAGE\n');
        const baseKeyCount = this.getAllKeys(this.languages[BASE_LANG]).length;
        for (const lang of SUPPORTED_LANGS) {
            const keyCount = this.getAllKeys(this.languages[lang]).length;
            const coverage = ((keyCount / baseKeyCount) * 100).toFixed(1);
            const bar = '█'.repeat(Math.floor(coverage / 5)) + '░'.repeat(20 - Math.floor(coverage / 5));
            console.log(`${lang.toUpperCase().padEnd(4)} ${bar} ${coverage}% (${keyCount}/${baseKeyCount} keys)`);
        }
        console.log('');

        // Missing Keys Detail
        if (Object.keys(this.issues.missingKeys).length > 0) {
            console.log('❌ MISSING TRANSLATIONS\n');
            for (const [lang, keys] of Object.entries(this.issues.missingKeys)) {
                console.log(`${lang.toUpperCase()} - Missing ${keys.length} keys:\n`);

                // Group by top-level key
                const grouped = {};
                for (const key of keys) {
                    const topLevel = key.split('.')[0];
                    if (!grouped[topLevel]) grouped[topLevel] = [];
                    grouped[topLevel].push(key);
                }

                for (const [topLevel, subKeys] of Object.entries(grouped)) {
                    console.log(`  ${topLevel}: ${subKeys.length} missing keys`);
                    if (subKeys.length <= 5) {
                        subKeys.forEach(k => console.log(`    - ${k}`));
                    } else {
                        subKeys.slice(0, 3).forEach(k => console.log(`    - ${k}`));
                        console.log(`    ... and ${subKeys.length - 3} more`);
                    }
                }
                console.log('');
            }
        }

        // Placeholder Mismatches
        if (this.issues.placeholderMismatches.length > 0) {
            console.log('⚠️  PLACEHOLDER MISMATCHES\n');
            this.issues.placeholderMismatches.slice(0, 10).forEach(issue => {
                console.log(`Key: ${issue.key}`);
                console.log(`Lang: ${issue.lang.toUpperCase()}`);
                if (issue.missing.length > 0) {
                    console.log(`Missing: {${issue.missing.join('}, {')}}`);
                }
                if (issue.extra.length > 0) {
                    console.log(`Extra: {${issue.extra.join('}, {')}}`);
                }
                console.log('');
            });
            if (this.issues.placeholderMismatches.length > 10) {
                console.log(`... and ${this.issues.placeholderMismatches.length - 10} more mismatches\n`);
            }
        }

        // Empty Values
        if (this.issues.emptyValues.length > 0) {
            console.log('⚠️  EMPTY VALUES\n');
            this.issues.emptyValues.slice(0, 10).forEach(issue => {
                console.log(`${issue.lang.toUpperCase()}: ${issue.key}`);
            });
            if (this.issues.emptyValues.length > 10) {
                console.log(`... and ${this.issues.emptyValues.length - 10} more empty values`);
            }
            console.log('');
        }

        // Recommendations
        console.log('💡 RECOMMENDATIONS\n');
        const totalMissing = Object.values(this.issues.missingKeys).reduce((sum, keys) => sum + keys.length, 0);

        if (totalMissing > 0) {
            console.log(`1. Add ${totalMissing} missing translations to complete EN and JP`);
        }
        if (this.issues.placeholderMismatches.length > 0) {
            console.log(`2. Fix ${this.issues.placeholderMismatches.length} placeholder mismatches`);
        }
        if (this.issues.emptyValues.length > 0) {
            console.log(`3. Fill ${this.issues.emptyValues.length} empty values`);
        }
        console.log('4. Unify Music JSON language system with main YAML system');
        console.log('5. Add Japanese support to Music system');
        console.log('');

        console.log('='.repeat(80) + '\n');
    }

    /**
     * Export missing keys to file for easy addition
     */
    exportMissingKeys() {
        const outputDir = path.join(__dirname, '..', 'translation-fixes');
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        for (const [lang, keys] of Object.entries(this.issues.missingKeys)) {
            const output = {};

            // Group by top-level key and get base values
            for (const key of keys) {
                const value = this.getNestedValue(this.languages[BASE_LANG], key);
                const parts = key.split('.');

                let current = output;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!current[parts[i]]) current[parts[i]] = {};
                    current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = value;
            }

            const outputPath = path.join(outputDir, `missing-${lang}.yml`);
            const yamlContent = yaml.dump(output, { lineWidth: -1, noRefs: true });
            fs.writeFileSync(outputPath, yamlContent, 'utf8');

            console.log(`📝 Exported missing keys for ${lang.toUpperCase()}: ${outputPath}`);
        }
    }

    /**
     * Run all validations
     */
    run() {
        this.loadLanguageFiles();
        this.checkMissingTranslations();
        this.checkOrphanedKeys();
        this.checkPlaceholders();
        this.checkEmptyValues();
        this.checkMusicSystem();
        this.generateReport();

        if (Object.keys(this.issues.missingKeys).length > 0) {
            this.exportMissingKeys();
        }
    }
}

// Run validation
if (require.main === module) {
    const validator = new TranslationValidator();
    validator.run();
}

module.exports = TranslationValidator;
