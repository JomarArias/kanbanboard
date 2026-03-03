import mongoose from 'mongoose';

const uri = "mongodb+srv://jusittoledob51_db_user:37yJu1GCvgUirrX8@kanban.ruehsyp.mongodb.net/kanban?appName=Kanban";

async function main() {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    try {
        console.log('Dropping auth0Id_1 index from users collection...');
        await mongoose.connection.collection('users').dropIndex('auth0Id_1');
        console.log('Index dropped successfully.');
    } catch (e) {
        console.error('Error dropping index (it might already be dropped):', e);
    }
    await mongoose.disconnect();
    console.log('Disconnected.');
}
main();
