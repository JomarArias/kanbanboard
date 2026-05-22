/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.9.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyAHY6KX5bSx7uyKWR-lxgzoQxXJCJDPe1c',
  authDomain: 'dapperkanban.firebaseapp.com',
  projectId: 'dapperkanban',
  storageBucket: 'dapperkanban.firebasestorage.app',
  messagingSenderId: '6310512244',
  appId: '1:6310512244:web:077d8bbac2d1af3473f321',
  measurementId: 'G-4LPHMRRPN4'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message:', payload);
});
