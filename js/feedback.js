document.addEventListener("DOMContentLoaded", () => {
    // Initialize Firebase (assuming firebase-config.js is loaded)
    // Import the Firebase SDKs
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    // import { initializeApp } from "firebase/app";
    // import { getAnalytics } from "firebase/analytics";
  
    const auth = firebase.auth()
    const db = firebase.firestore()
  
    // Get session ID from URL
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get("id")
  
    if (!sessionId) {
      alert("No session ID provided")
      window.location.href = "dashboard.html"
      return
    }
  
    // User profile dropdown
    const userProfile = document.getElementById("user-profile")
    const dropdownMenu = document.getElementById("dropdown-menu")
  
    if (userProfile && dropdownMenu) {
      userProfile.addEventListener("click", () => {
        dropdownMenu.classList.toggle("active")
      })
  
      // Close dropdown when clicking outside
      document.addEventListener("click", (event) => {
        if (!userProfile.contains(event.target) && !dropdownMenu.contains(event.target)) {
          dropdownMenu.classList.remove("active")
        }
      })
    }
  
    // Logout button
    const logoutBtn = document.getElementById("logout-btn")
    if (logoutBtn) {
      logoutBtn.addEventListener("click", (e) => {
        e.preventDefault()
        auth.signOut().then(() => {
          window.location.href = "index.html"
        })
      })
    }
  
    // Load user info
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Update user profile
        const userName = document.getElementById("user-name")
        const userAvatar = document.getElementById("user-avatar")
  
        if (userName) {
          userName.textContent = user.displayName || "User"
        }
  
        if (userAvatar && user.photoURL) {
          userAvatar.src = user.photoURL
        }
  
        // Load feedback data
        loadFeedbackData(sessionId, user.uid)
      }
    })
  
    // Download PDF button
    const downloadPdfBtn = document.getElementById("download-pdf-btn")
    if (downloadPdfBtn) {
      downloadPdfBtn.addEventListener("click", () => {
        alert("PDF download functionality would be implemented here")
        // In a real implementation, this would generate and download a PDF
      })
    }
  
    // Load feedback data
    async function loadFeedbackData(sessionId, userId) {
      try {
        // Get session data
        const sessionDoc = await db.collection("sessions").doc(sessionId).get()
  
        if (!sessionDoc.exists) {
          alert("Session not found")
          window.location.href = "dashboard.html"
          return
        }
  
        const sessionData = sessionDoc.data()
  
        // Get results data
        const resultsDoc = await db.collection("sessions").doc(sessionId).collection("results").doc(userId).get()
  
        if (!resultsDoc.exists) {
          alert("No results found for this session")
          window.location.href = "dashboard.html"
          return
        }
  
        const resultsData = resultsDoc.data()
  
        // Update interview title and date
        const interviewTitle = document.getElementById("interview-title")
        const interviewDate = document.getElementById("interview-date")
  
        if (interviewTitle) {
          interviewTitle.textContent = sessionData.title || "Interview Feedback"
        }
  
        if (interviewDate && resultsData.completedAt) {
          const date = new Date(resultsData.completedAt.toDate())
          interviewDate.textContent = `Date: ${date.toLocaleDateString()}`
        }
  
        // Update performance metrics
        updatePerformanceMetrics(resultsData)
  
        // Update detailed feedback
        updateDetailedFeedback(sessionData.questions, resultsData)
  
        // Update improvement suggestions
        updateImprovementSuggestions(resultsData)
      } catch (error) {
        console.error("Error loading feedback data:", error)
        alert("Error loading feedback data. Please try again.")
      }
    }
  
    // Update performance metrics
    function updatePerformanceMetrics(resultsData) {
      const overallScore = document.getElementById("overall-score")
      const questionsAnswered = document.getElementById("questions-answered")
      const avgResponseTime = document.getElementById("avg-response-time")
      const performanceSummary = document.getElementById("performance-summary")
  
      if (!resultsData.feedback || !resultsData.feedback.overall) return
  
      const feedback = resultsData.feedback
  
      // Update overall score
      if (overallScore) {
        overallScore.textContent = `${feedback.overall.score}/10`
      }
  
      // Update questions answered
      if (questionsAnswered) {
        const answeredCount = resultsData.answers.filter((a) => a && a.trim() !== "").length
        const totalCount = resultsData.answers.length
        questionsAnswered.textContent = `${answeredCount}/${totalCount}`
      }
  
      // Update average response time (mock data)
      if (avgResponseTime) {
        avgResponseTime.textContent = "2:15"
      }
  
      // Update performance summary
      if (performanceSummary) {
        performanceSummary.textContent = feedback.overall.summary
      }
    }
  
    // Update detailed feedback
    function updateDetailedFeedback(questions, resultsData) {
      const feedbackAccordion = document.getElementById("feedback-accordion")
  
      if (!feedbackAccordion || !resultsData.feedback || !resultsData.feedback.questions) return
  
      const feedback = resultsData.feedback
  
      // Clear loading message
      feedbackAccordion.innerHTML = ""
  
      // Add feedback items
      feedback.questions.forEach((item, index) => {
        const feedbackItem = document.createElement("div")
        feedbackItem.className = "feedback-item"
        feedbackItem.innerHTML = `
                  <div class="feedback-item-header">
                      <h3>Question ${index + 1}</h3>
                      <div class="score">Score: ${item.score}/10</div>
                      <div class="feedback-item-toggle">▼</div>
                  </div>
                  <div class="feedback-item-content">
                      <div class="feedback-section">
                          <h4>Question</h4>
                          <div class="feedback-text">${item.question}</div>
                      </div>
                      
                      <div class="feedback-section">
                          <h4>Comparison</h4>
                          <div class="feedback-comparison">
                              <div class="your-answer">
                                  <h5>Your Answer</h5>
                                  <p>${item.userAnswer}</p>
                              </div>
                              <div class="expected-answer">
                                  <h5>Expected Answer</h5>
                                  <p>${item.expectedAnswer}</p>
                              </div>
                          </div>
                      </div>
                      
                      <div class="feedback-section">
                          <h4>Feedback</h4>
                          <div class="feedback-text">${item.feedback}</div>
                      </div>
                      
                      <div class="feedback-section">
                          <h4>Areas for Improvement</h4>
                          <div class="feedback-text">${item.improvements}</div>
                      </div>
                  </div>
              `
  
        feedbackAccordion.appendChild(feedbackItem)
  
        // Add click event to toggle accordion
        const header = feedbackItem.querySelector(".feedback-item-header")
        header.addEventListener("click", () => {
          feedbackItem.classList.toggle("active")
        })
      })
  
      // Open first item by default
      const firstItem = feedbackAccordion.querySelector(".feedback-item")
      if (firstItem) {
        firstItem.classList.add("active")
      }
    }
  
    // Update improvement suggestions
    function updateImprovementSuggestions(resultsData) {
      const improvementList = document.getElementById("improvement-list")
  
      if (!improvementList || !resultsData.feedback || !resultsData.feedback.overall) return
  
      const improvements = resultsData.feedback.overall.improvements
  
      if (!improvements || improvements.length === 0) {
        improvementList.innerHTML = "<li>No specific improvements suggested.</li>"
        return
      }
  
      // Clear loading message
      improvementList.innerHTML = ""
  
      // Add improvement items
      improvements.forEach((improvement) => {
        const li = document.createElement("li")
        li.textContent = improvement
        improvementList.appendChild(li)
      })
    }
  })
  