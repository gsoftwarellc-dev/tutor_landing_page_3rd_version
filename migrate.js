const fs = require('fs');
const path = require('path');
const db = require('./database');

const submissionsFile = path.join(__dirname, 'data', 'submissions.json');

async function migrate() {
    console.log("Starting migration...");

    // Give DB time to initialize tables (simple fix for async init race condition)
    await new Promise(r => setTimeout(r, 1000));

    if (fs.existsSync(submissionsFile)) {
        const raw = fs.readFileSync(submissionsFile, 'utf8');
        let submissions = [];
        try {
            submissions = JSON.parse(raw);
        } catch (e) {
            console.error("Error parsing submissions.json", e);
        }

        if (Array.isArray(submissions) && submissions.length > 0) {
            console.log(`Found ${submissions.length} submissions to migrate.`);

            for (const sub of submissions) {
                // Check if exists
                try {
                    const existing = await db.get("SELECT id FROM submissions WHERE id = ?", [sub.id]);
                    if (!existing) {
                        await db.run(`INSERT INTO submissions (
                            id, parentName, parentEmail, parentPhone, studentName, studentDob, 
                            relationship, specificNeeds, subjects, discoverySource, isCharity, 
                            submittedAt, isTrashed, trashedAt
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                            sub.id,
                            sub.parentName,
                            sub.parentEmail,
                            sub.parentPhone,
                            sub.studentName,
                            sub.studentDob,
                            sub.relationship || '',
                            sub.specificNeeds || '',
                            Array.isArray(sub.subjects) ? sub.subjects.join(',') : (sub.subjects || ''),
                            sub.discoverySource || '',
                            (sub.isChariity || sub.isCharity) ? 1 : 0,
                            sub.submittedAt,
                            sub.isTrashed ? 1 : 0,
                            sub.trashedAt || null
                        ]);
                        process.stdout.write('.');
                    }
                } catch (err) {
                    console.error("Error migrating row:", err);
                }
            }
            console.log("\nMigration completed.");
        } else {
            console.log("No submissions found in JSON to migrate.");
        }
    } else {
        console.log("submissions.json does not exist. Skipping.");
    }
}

migrate();
