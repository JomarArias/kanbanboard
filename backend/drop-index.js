const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://jusittoledob51_db_user:37yJu1GCvgUirrX8@kanban.ruehsyp.mongodb.net/kanban?appName=Kanban";

async function main() {
    console.log('Connecting to MongoDB...');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const db = client.db('kanban');
        const coll = db.collection('users');
        console.log('Dropping auth0Id_1 index from users collection...');
        await coll.dropIndex('auth0Id_1');
        console.log('Index dropped successfully.');
    } catch (e) {
        console.error('Error dropping index (it might already be dropped):', e);
    } finally {
        await client.close();
        console.log('Disconnected.');
    }
}
main();
