import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
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

  // Create session button
  const createSessionBtn = document.getElementById("create-session-btn")
  if (createSessionBtn) {
    createSessionBtn.addEventListener("click", () => {
      window.location.href = "create-session.html"
    })
  }

  // Join session
  const joinSessionBtn = document.getElementById("join-session-btn")
  if (joinSessionBtn) {
    joinSessionBtn.addEventListener("click", () => {
      const sessionCode = document.getElementById("session-code").value.trim()

      if (!sessionCode) {
        alert("Please enter a session code")
        return
      }

      // Get sessions from sessionStorage
      const sessions = JSON.parse(sessionStorage.getItem('sessions') || '[]');
      const session = sessions.find(s => s.code === sessionCode && s.status === 'active');

      if (!session) {
        alert("No active session found with this code");
        return;
      }

      // Check if user is already a participant
      const user = auth.currentUser;
      const isParticipant = session.participants.some((p) => p.uid === user.uid);

      if (!isParticipant) {
        // Add user to participants
        session.participants.push({
          uid: user.uid,
          name: user.displayName || "Anonymous",
          role: "participant",
        });

        // Update sessions in sessionStorage
        sessionStorage.setItem('sessions', JSON.stringify(sessions));
      }

      // Store current session code
      sessionStorage.setItem('currentSessionId', sessionCode);

      // Redirect to interview room
      window.location.href = `interview-room.html?code=${sessionCode}`;
    });
  }

  // Load user info
  loadUserInfo()

  // Load recent sessions
  loadRecentSessions()
})

// Load user information
function loadUserInfo() {
  const user = auth.currentUser

  if (user) {
    // Update welcome message
    const welcomeName = document.getElementById("welcome-name")
    if (welcomeName) {
      welcomeName.textContent = user.displayName || "User"
    }

    // Update user profile
    const userName = document.getElementById("user-name")
    const userAvatar = document.getElementById("user-avatar")

    if (userName) {
      userName.textContent = user.displayName || "User"
    }

    if (userAvatar && user.photoURL) {
      userAvatar.src = user.photoURL
    }
  }
}

// Load recent sessions
function loadRecentSessions() {
  const sessionsList = document.getElementById("sessions-list");
  console.log("Loading recent sessions...");

  if (!sessionsList) {
    console.error("Sessions list element not found");
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.error("No user logged in");
    return;
  }

  try {
    // Get sessions from sessionStorage
    const sessionsStr = sessionStorage.getItem('sessions');
    console.log("Sessions from storage:", sessionsStr);
    
    const sessions = JSON.parse(sessionsStr || '[]');
    console.log("Parsed sessions:", sessions);
    
    // Filter sessions where user is a participant and sort by creation date
    const userSessions = sessions
      .filter(session => session.participants.some(p => p.uid === user.uid))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    console.log("User sessions:", userSessions);

    if (userSessions.length === 0) {
      sessionsList.innerHTML = '<div class="no-sessions"><p>No recent sessions found.</p></div>';
      return;
    }

    let sessionsHTML = '';

    userSessions.forEach((session) => {
      const date = new Date(session.createdAt).toLocaleDateString();
      const hasStarted = session.currentQuestionIndex > 0;
      const isCompleted = session.status === "completed";

      sessionsHTML += `
        <div class="session-card" data-session-code="${session.code}">
          <div class="session-header">
            <div class="session-title">
              <h3>${session.title}</h3>
              <span class="session-code">Code: ${session.code}</span>
            </div>
            <div class="session-meta">
              <span class="session-type">${session.interviewType}</span>
              <span class="session-date">${date}</span>
              <span class="session-status ${session.status}">${session.status}</span>
            </div>
          </div>
          
          <div class="session-details">
            <div class="detail-item">
              <span class="label">Role:</span>
              <span class="value">${session.jobRole}</span>
            </div>
            <div class="detail-item">
              <span class="label">Experience:</span>
              <span class="value">${session.experienceLevel}</span>
            </div>
            ${session.specificSkills ? `
              <div class="detail-item">
                <span class="label">Skills:</span>
                <span class="value">${session.specificSkills}</span>
              </div>
            ` : ''}
          </div>

          <div class="questions-section">
            <button class="accordion-btn" onclick="toggleQuestions(this)">
              <span>View Questions</span>
              <span class="accordion-icon">▼</span>
            </button>
            <div class="questions-content">
              ${session.questions.map((q, index) => `
                <div class="question-item">
                  <div class="question-header">
                    <h4>Question ${index + 1}</h4>
                    ${hasStarted ? `<span class="question-status ${index < session.currentQuestionIndex ? 'completed' : 'pending'}">
                      ${index < session.currentQuestionIndex ? 'Completed' : 'Pending'}
                    </span>` : ''}
                  </div>
                  <p class="question-text">${q.question}</p>
                  <div class="question-details">
                    <div class="expected-answer">
                      <h5>Expected Answer:</h5>
                      <p>${q.expectedAnswer}</p>
                    </div>
                    <div class="evaluation-criteria">
                      <h5>Evaluation Criteria:</h5>
                      <p>${q.evaluationCriteria}</p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="session-actions">
            ${
              isCompleted
                ? `<a href="feedback.html?code=${session.code}" class="btn btn-primary">View Results</a>`
                : hasStarted
                ? `<a href="interview-room.html?code=${session.code}" class="btn btn-outline">Continue Interview</a>`
                : `<a href="interview-room.html?code=${session.code}" class="btn btn-primary">Start Interview</a>`
            }
            <button class="btn btn-delete" onclick="deleteSession('${session.code}')">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 4h12M5.333 4V2.667c0-.737.597-1.334 1.334-1.334h2.666c.737 0 1.334.597 1.334 1.334V4m2 0v9.333c0 .737-.597 1.334-1.334 1.334H4.667c-.737 0-1.334-.597-1.334-1.334V4h9.334z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Delete
            </button>
          </div>
        </div>
      `;
    });

    sessionsList.innerHTML = sessionsHTML;

    // Add the toggle function to window object
    window.toggleQuestions = function(button) {
      const content = button.nextElementSibling;
      const icon = button.querySelector('.accordion-icon');
      
      // Toggle active class
      button.classList.toggle('active');
      
      // Toggle content visibility
      if (content.style.maxHeight) {
        content.style.maxHeight = null;
        icon.textContent = '▼';
      } else {
        content.style.maxHeight = content.scrollHeight + "px";
        icon.textContent = '▲';
      }
    };

    // Add delete function to window object
    window.deleteSession = function(sessionCode) {
      if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
        try {
          // Get current sessions
          const sessions = JSON.parse(sessionStorage.getItem('sessions') || '[]');
          
          // Filter out the session to delete
          const updatedSessions = sessions.filter(session => session.code !== sessionCode);
          
          // Save back to sessionStorage
          sessionStorage.setItem('sessions', JSON.stringify(updatedSessions));
          
          // Remove the session card from DOM
          const sessionCard = document.querySelector(`[data-session-code="${sessionCode}"]`);
          if (sessionCard) {
            sessionCard.remove();
          }
          
          // If no sessions left, show the no sessions message
          if (updatedSessions.length === 0) {
            sessionsList.innerHTML = '<div class="no-sessions"><p>No recent sessions found.</p></div>';
          }
        } catch (error) {
          console.error('Error deleting session:', error);
          alert('Failed to delete session. Please try again.');
        }
      }
    };

  } catch (error) {
    console.error("Error loading sessions:", error);
    sessionsList.innerHTML = '<div class="no-sessions"><p>Error loading sessions.</p></div>';
  }
}

// Call loadRecentSessions when auth state changes
auth.onAuthStateChanged((user) => {
  if (user) {
    loadRecentSessions();
  }
});

