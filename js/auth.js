import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the login page
  const loginForm = document.getElementById("login-form")
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin)
  }

  // Check if we're on the signup page
  const signupForm = document.getElementById("signup-form")
  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup)
  }

  // Google auth buttons
  const googleLoginBtn = document.getElementById("google-login")
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener("click", handleGoogleAuth)
  }

  const googleSignupBtn = document.getElementById("google-signup")
  if (googleSignupBtn) {
    googleSignupBtn.addEventListener("click", handleGoogleAuth)
  }

  // Check if user is already logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // User is signed in, redirect to dashboard
      if (window.location.pathname.includes("login.html") || window.location.pathname.includes("signup.html")) {
        window.location.href = "dashboard.html"
      }
    }
  })
})

// Handle login form submission
function handleLogin(e) {
  e.preventDefault()

  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const errorMessage = document.getElementById("error-message")

  // Clear previous error messages
  errorMessage.textContent = ""
  errorMessage.style.display = "none"

  // Sign in with email and password
  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed in successfully
      window.location.href = "dashboard.html"
    })
    .catch((error) => {
      // Handle errors
      errorMessage.textContent = error.message
      errorMessage.style.display = "block"
    })
}

// Handle signup form submission
function handleSignup(e) {
  e.preventDefault()

  const name = document.getElementById("name").value
  const email = document.getElementById("email").value
  const password = document.getElementById("password").value
  const errorMessage = document.getElementById("error-message")

  // Clear previous error messages
  errorMessage.textContent = ""
  errorMessage.style.display = "none"

  // Create user with email and password
  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      // Signed up successfully
      const user = userCredential.user

      // Update user profile with name
      return updateProfile(user, {
        displayName: name,
      })
        .then(() => {
          // Create user document in Firestore
          return setDoc(doc(db, "users", user.uid), {
            name: name,
            email: email,
            createdAt: new Date(),
          })
        })
        .then(() => {
          // Redirect to dashboard
          window.location.href = "dashboard.html"
        })
    })
    .catch((error) => {
      // Handle errors
      errorMessage.textContent = error.message
      errorMessage.style.display = "block"
    })
}

// Handle Google authentication
function handleGoogleAuth() {
  const provider = new GoogleAuthProvider()

  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user

      // Check if this is a new user
      const isNewUser = result.additionalUserInfo.isNewUser

      if (isNewUser) {
        // Create user document in Firestore for new users
        return setDoc(doc(db, "users", user.uid), {
          name: user.displayName,
          email: user.email,
          createdAt: new Date(),
        }).then(() => {
          window.location.href = "dashboard.html"
        })
      } else {
        // Existing user, redirect to dashboard
        window.location.href = "dashboard.html"
      }
    })
    .catch((error) => {
      const errorMessage = document.getElementById("error-message")
      errorMessage.textContent = error.message
      errorMessage.style.display = "block"
    })
}
