// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrwJ2NPJNMJL1RrAdJ1BuO3qjU1p88q30",
  authDomain: "ourrecipes-76451.firebaseapp.com",
  projectId: "ourrecipes-76451",
  storageBucket: "ourrecipes-76451.firebasestorage.app",
  messagingSenderId: "1071085428750",
  appId: "1:1071085428750:web:d543c0c73b86c573935c5f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
