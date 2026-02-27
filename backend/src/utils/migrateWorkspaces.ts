import { Workspace } from '../models/Workspace.js';
import { Card } from '../models/card.js';
import { User } from '../models/User.js';

export const migrateWorkspaces = async () => {
    try {
        console.log('🔄 Checking for orphan cards to migrate...');

        // Verify if there are any cards without a workspace
        const orphanCardsCount = await Card.countDocuments({ workspaceId: { $exists: false } });

        if (orphanCardsCount === 0) {
            console.log('✅ No orphan cards found. Migration skipped.');
            return;
        }

        console.log(`⚠️ Found ${orphanCardsCount} orphan cards. Starting migration...`);

        // Find an admin user to own the default workspace
        // Usually the first user in the system is acceptable for this migration
        const adminUser = await User.findOne();
        if (!adminUser) {
            console.error('❌ Migration failed: No users found in the database to assign the workspace to. Please login first.');
            return;
        }

        // Check if Default workspace already exists for this user
        let defaultWorkspace = await Workspace.findOne({ name: 'Default Personal Workspace', owners: adminUser._id });

        if (!defaultWorkspace) {
            defaultWorkspace = await Workspace.create({
                name: 'Default Personal Workspace',
                owners: [adminUser.id], // Using .id for the generated string/ObjectId
                members: []
            });
            console.log(`📁 Created Default Personal Workspace (ID: ${defaultWorkspace.id})`);
        }

        // Update all orphan cards
        const result = await Card.updateMany(
            { workspaceId: { $exists: false } },
            { $set: { workspaceId: defaultWorkspace._id } }
        );

        console.log(`✅ Successfully migrated ${result.modifiedCount} cards to Workspace ${defaultWorkspace.id}`);

    } catch (error) {
        console.error('❌ Workspace Migration failed:', error);
    }
};
