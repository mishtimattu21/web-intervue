import { auth } from "./firebaseConfig.js"

document.addEventListener("DOMContentLoaded", () => {
  // Mobile menu toggle
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
  const header = document.querySelector("header")

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      header.classList.toggle("mobile-menu-active")
    })
  }

  // Check if user is logged in
  auth.onAuthStateChanged((user) => {
    const authButtons = document.querySelector(".auth-buttons")

    if (user && authButtons) {
      // User is signed in
      authButtons.innerHTML = `
                <a href="dashboard.html" class="btn btn-primary">Dashboard</a>
            `
    }
  })
})
