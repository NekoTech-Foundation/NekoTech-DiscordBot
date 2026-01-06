const db = require('./database');

class SQLiteModel {
    constructor(tableName, primaryKeys, defaultDataFn) {
        this.tableName = tableName;
        this.primaryKeys = Array.isArray(primaryKeys) ? primaryKeys : [primaryKeys];
        this.defaultDataFn = defaultDataFn;

        // Ensure primary keys are strings for SQL construction
        const pkDef = this.primaryKeys.join(', ');
        const pkClause = `PRIMARY KEY (${pkDef})`;

        // Create table
        db.prepare(`
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                ${this.primaryKeys.map(k => `${k} TEXT`).join(',\n')},
                data TEXT,
                ${pkClause}
            )
        `).run();

        // Pre-prepare statements for performance
        const whereClause = this.primaryKeys.map(k => `${k} = ?`).join(' AND ');
        this.selectStmt = db.prepare(`SELECT data FROM ${this.tableName} WHERE ${whereClause}`);
        this.insertStmt = db.prepare(`INSERT OR REPLACE INTO ${this.tableName} (${this.primaryKeys.join(', ')}, data) VALUES (${this.primaryKeys.map(() => '?').join(', ')}, ?)`);
        this.deleteStmt = db.prepare(`DELETE FROM ${this.tableName} WHERE ${whereClause}`);
    }

    _wrap(data) {
        if (!data) return null;
        const self = this;
        
        // Define save method
        Object.defineProperty(data, 'save', {
            value: function() {
                const pkValues = self.primaryKeys.map(k => this[k]);
                // Check if PKs exist in data
                if (pkValues.some(v => v === undefined || v === null)) {
                    console.error(`[SQLiteModel] Missing primary keys for table ${self.tableName}:`, self.primaryKeys, data);
                    throw new Error(`Missing primary keys for table ${self.tableName}`);
                }
                
                self.insertStmt.run(...pkValues, JSON.stringify(this));
                return Promise.resolve(this);
            },
            enumerable: false,
            writable: true,
            configurable: true
        });

        // Define delete method
        Object.defineProperty(data, 'delete', {
             value: function() {
                 const pkValues = self.primaryKeys.map(k => this[k]);
                 self.deleteStmt.run(...pkValues);
                 return Promise.resolve(true);
             },
             enumerable: false,
             writable: true,
             configurable: true
        });

        return data;
    }

    async findOne(query) {
        const pkValues = this.primaryKeys.map(k => query[k]);
        if (pkValues.some(v => v === undefined)) {
            // If query doesn't restrict by PK, we might need a scan (not implemented efficiently here)
            // For now, assume findOne is ALWAYS used with PKs as per this codebase's common pattern.
            // If purely simulating mongoose, we might return null.
            return null; 
        }

        const row = this.selectStmt.get(...pkValues);
        if (row) {
            try {
                const data = JSON.parse(row.data);
                // Merge with default to handle schema evolution
                // We must construct default data using the PKs found in the row/query
                const defaultObj = this.defaultDataFn ? this.defaultDataFn(query) : {};
                const merged = { ...defaultObj, ...data };
                return this._wrap(merged);
            } catch (e) {
                console.error(`Error parsing JSON for ${this.tableName}:`, e);
                return this._wrap(this.defaultDataFn ? this.defaultDataFn(query) : {});
            }
        }
        return null;
    }

    async create(doc) {
        const defaultObj = this.defaultDataFn ? this.defaultDataFn(doc) : {};
        const fullDoc = { ...defaultObj, ...doc };
        const wrapped = this._wrap(fullDoc);
        await wrapped.save();
        return wrapped;
    }

    // Add find method for partial matches/scans if needed
    async find(query = {}) {
        // If empty query, return all
        if (Object.keys(query).length === 0) {
             const rows = db.prepare(`SELECT data FROM ${this.tableName}`).all();
             return rows.map(row => {
                 const data = JSON.parse(row.data);
                 const defaultObj = this.defaultDataFn ? this.defaultDataFn(data) : {};
                 const merged = { ...defaultObj, ...data };
                 return this._wrap(merged);
             });
        }
        
        // Client-side filtering with operator support
        const rows = db.prepare(`SELECT data FROM ${this.tableName}`).all();
        const results = [];
        for (const row of rows) {
            const data = JSON.parse(row.data);
            let match = true;
            for (const [key, value] of Object.entries(query)) {
                const itemValue = data[key];

                if (typeof value === 'object' && value !== null && Object.keys(value).some(k => k.startsWith('$'))) {
                    // Handle operators
                    for (const [op, opValue] of Object.entries(value)) {
                        if (op === '$eq' && itemValue !== opValue) match = false;
                        else if (op === '$ne' && itemValue === opValue) match = false;
                        else if (op === '$gt' && !(itemValue > opValue)) match = false;
                        else if (op === '$gte' && !(itemValue >= opValue)) match = false;
                        else if (op === '$lt' && !(itemValue < opValue)) match = false;
                        else if (op === '$lte' && !(itemValue <= opValue)) match = false;
                        else if (op === '$in' && !opValue.includes(itemValue)) match = false;
                        else if (op === '$nin' && opValue.includes(itemValue)) match = false;
                        
                        if (!match) break;
                    }
                } else {
                    // Direct equality
                    if (itemValue !== value) {
                        match = false;
                    }
                }
                if (!match) break;
            }
            if (match) {
                const defaultObj = this.defaultDataFn ? this.defaultDataFn(data) : {};
                const merged = { ...defaultObj, ...data };
                results.push(this._wrap(merged));
            }
        }
        return results;
    }

    async countDocuments(query = {}) {
        const found = await this.find(query);
        return found.length;
    }

    async deleteOne(query) {
        const found = await this.find(query);
        if (found.length > 0) {
            await found[0].delete();
            return { deletedCount: 1 };
        }
        return { deletedCount: 0 };
    }

    async deleteMany(query) {
        const found = await this.find(query);
        for (const doc of found) {
            await doc.delete();
        }
        return { deletedCount: found.length };
    }

    async updateMany(query, update) {
        const found = await this.find(query);
        let modifiedCount = 0;
        for (const doc of found) {
            // Very basic update support: { key: value } or { $set: { key: value } }
            // Does not support complex operators like $inc, $push effectively here without implementing them
            // Implementation assumes simplified updates: properties to merge
            
            let changes = update;
            if (update.$set) {
                changes = { ...changes, ...update.$set };
                delete changes.$set;
            }
            // Add other mock operators if needed or assume simple objects
            
            Object.assign(doc, changes);
            await doc.save();
            modifiedCount++;
        }
        return { modifiedCount };
    }
    
    async findOneAndUpdate(query, update, options = { upsert: false, new: true, setDefaultsOnInsert: true }) {
         let doc = await this.findOne(query);
         if (!doc) {
             if (options.upsert) {
                // If upsert, we need PKs from query
                const insertData = { ...query };
                // Also apply updates if they are simple $set or direct fields
                if (update.$setOnInsert) {
                     Object.assign(insertData, update.$setOnInsert);
                }
                const changes = update.$set ? update.$set : update;
                // strip operators from changes if present at top level (simple check)
                 const cleanChanges = {};
                 for(const k of Object.keys(changes)) {
                     if(!k.startsWith('$')) cleanChanges[k] = changes[k];
                 }
                 
                Object.assign(insertData, cleanChanges);
                return await this.create(insertData);
             }
             return null;
         }

         // Update existing
         let changes = update.$set ? update.$set : update;
         // Handle very basic operators
         if (update.$inc) {
             for (const [k, v] of Object.entries(update.$inc)) {
                 if (typeof doc[k] === 'number') doc[k] += v;
                 else doc[k] = v;
             }
         }
         
         const cleanChanges = {};
         for(const k of Object.keys(changes)) {
             if(!k.startsWith('$')) cleanChanges[k] = changes[k];
         }
         
         Object.assign(doc, cleanChanges);
         await doc.save();
         return doc;
    }
}

module.exports = SQLiteModel;
