import { auth } from "./firebase-config.js"

// Create a promise that resolves when auth is initialized
const authInitialized = new Promise((resolve) => {
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // User is not signed in, redirect to login
      window.location.href = "login.html"
    } else {
      // Auth is initialized and user is signed in
      resolve(user)
    }
  })
})

// Export the auth initialization promise
export { authInitialized }
