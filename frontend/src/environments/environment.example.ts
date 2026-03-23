const runtimeProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const runtimeHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const runtimeBackendOrigin = `${runtimeProtocol}//${runtimeHostname}:3000`;

export const environment = {
    production: false,
    apiUrl: `${runtimeBackendOrigin}/api`,
    socketUrl: runtimeBackendOrigin,
    firebase: {
        apiKey: 'YOUR_FIREBASE_API_KEY',
        authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
        projectId: 'YOUR_PROJECT_ID',
        storageBucket: 'YOUR_PROJECT_ID.firebasestorage.app',
        messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
        appId: 'YOUR_APP_ID',
        measurementId: 'YOUR_MEASUREMENT_ID'
    }
};
