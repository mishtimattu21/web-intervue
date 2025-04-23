import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js"
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"

const firebaseConfig = {
  apiKey: "AIzaSyBoyeHRe4oIXYIp3-nOaBE_qgCmPyhlMCU",
  authDomain: "intervue-18af3.firebaseapp.com",
  projectId: "intervue-18af3",
  storageBucket: "intervue-18af3.appspot.com",
  messagingSenderId: "509129469127",
  appId: "1:509129469127:web:1eeb52e713e4e45b5ae2e2",
}

// Initialize Firebase
let app;
try {
  app = initializeApp(firebaseConfig);
  console.log("Firebase app initialized successfully with config:", {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain
  });
} catch (error) {
  console.error("Error initializing Firebase app:", error);
  throw error;
}

// Initialize Auth
let auth;
try {
  auth = getAuth(app);
  console.log("Firebase Auth initialized successfully");
  
  // Add auth state change listener for debugging
  auth.onAuthStateChanged((user) => {
    console.log("Firebase Auth state changed:", user ? "User logged in" : "No user");
  });
} catch (error) {
  console.error("Error initializing Firebase Auth:", error);
  throw error;
}

// Initialize Firestore with proper settings
let db;
try {
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
  console.log("Firestore initialized successfully with persistence");
} catch (error) {
  console.error("Error initializing Firestore:", error);
  throw error;
}

// Export the initialized services
export { auth, db }
