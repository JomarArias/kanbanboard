const runtimeProtocol = typeof window !== 'undefined' ? window.location.protocol : 'http:';
const runtimeHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const runtimeBackendOrigin = `${runtimeProtocol}//${runtimeHostname}:3000`;

export const environment = {
    production: false,
    apiUrl: `${runtimeBackendOrigin}/api`,
    socketUrl: runtimeBackendOrigin,
    firebase: {
        apiKey: 'AIzaSyAHY6KX5bSx7uyKWR-lxgzoQxXJCJDPe1c',
        authDomain: 'dapperkanban.firebaseapp.com',
        projectId: 'dapperkanban',
        storageBucket: 'dapperkanban.firebasestorage.app',
        messagingSenderId: '6310512244',
        appId: '1:6310512244:web:077d8bbac2d1af3473f321',
        measurementId: 'G-4LPHMRRPN4'
    }
};


// export const environment = {
//    production: true,
//    apiUrl: 'https://kanbanboard-yckr.onrender.com/api',
//    socketUrl: 'https://kanbanboard-yckr.onrender.com'
//};
