import mongoose from 'mongoose';
import 'dotenv/config';
import { User, IUser } from '../models/User.js';
import { Workspace } from '../models/Workspace.js';

const MONGODB_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/kanban';

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('🔗 Conectado a MongoDB para Seeding...');

        // 1. Crear usuario Admin (Development)
        const adminEmail = 'admin@test.com';
        let admin = await User.findOne({ email: adminEmail });
        if (!admin) {
            admin = new User({
                firebaseUid: 'dev_admin_uid_12345',
                email: adminEmail,
                name: 'Dev Admin',
                picture: 'https://ui-avatars.com/api/?name=Dev+Admin&background=random',
                role: 'admin'
            });
            await admin.save();
            console.log('✅ Creado usuario Admin:', adminEmail);
        } else {
            console.log('ℹ️ Usuario Admin ya existe:', adminEmail);
        }

        // 1.1 Crear tablero personal para Admin si no tiene
        const adminPersonalBoardName = `tablero personal de ${admin.name}`;
        let adminWorkspace = await Workspace.findOne({ name: adminPersonalBoardName, owners: admin._id });
        if (!adminWorkspace) {
            adminWorkspace = await Workspace.create({
                name: adminPersonalBoardName,
                owners: [admin._id],
                members: []
            });
            console.log('✅ Creado Workspace personal para Admin');
        }

        // 2. Crear usuario Normal (Development)
        const userEmail = 'user@test.com';
        let normalUser = await User.findOne({ email: userEmail });
        if (!normalUser) {
            normalUser = new User({
                firebaseUid: 'dev_user_uid_67890',
                email: userEmail,
                name: 'Test User',
                picture: 'https://ui-avatars.com/api/?name=Test+User&background=random',
                role: 'member'
            });
            await normalUser.save();
            console.log('✅ Creado usuario Normal:', userEmail);
        } else {
            console.log('ℹ️ Usuario Normal ya existe:', userEmail);
        }

        // 2.1 Crear tablero personal para Normal User si no tiene
        const userPersonalBoardName = `tablero personal de ${normalUser.name}`;
        let userWorkspace = await Workspace.findOne({ name: userPersonalBoardName, owners: normalUser._id });
        if (!userWorkspace) {
            userWorkspace = await Workspace.create({
                name: userPersonalBoardName,
                owners: [normalUser._id],
                members: []
            });
            console.log('✅ Creado Workspace personal para Normal User');
        }

        console.log('🎉 Seeding completado con éxito.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error durante el seeding:', error);
        process.exit(1);
    }
}

seed();
