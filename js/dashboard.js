import { auth, db } from "./firebase-config.js";
import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

      // Find session with the given code
      const sessionsRef = collection(db, "sessions");
      const q = query(sessionsRef, where("code", "==", sessionCode), where("status", "==", "active"));
      
      getDocs(q)
        .then((querySnapshot) => {
          if (querySnapshot.empty) {
            alert("No active session found with this code");
            return;
          }

          // Get the first matching session
          const sessionDoc = querySnapshot.docs[0];
          const sessionId = sessionDoc.id;
          const sessionData = sessionDoc.data();

          // Check if user is already a participant
          const user = auth.currentUser;
          const isParticipant = sessionData.participants.some((p) => p.uid === user.uid);

          if (!isParticipant) {
            // Add user to participants
            return db
              .collection("sessions")
              .doc(sessionId)
              .update({
                participants: arrayUnion({
                  uid: user.uid,
                  name: user.displayName || "Anonymous",
                  role: "participant",
                }),
              })
              .then(() => {
                // Redirect to interview room
                window.location.href = `interview-room.html?id=${sessionId}`;
              });
          } else {
            // User is already a participant, just redirect
            window.location.href = `interview-room.html?id=${sessionId}`;
          }
        })
        .catch((error) => {
          console.error("Error joining session:", error);
          alert("Error joining session. Please try again.");
        });
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
async function loadRecentSessions() {
  const sessionsList = document.getElementById("sessions-list")

  if (!sessionsList) return

  const user = auth.currentUser
  if (!user) return

  try {
    // Query sessions where user is a participant
    const sessionsRef = collection(db, "sessions");
    const q = query(
      sessionsRef,
      where("participants", "array-contains", { uid: user.uid }),
      orderBy("createdAt", "desc"),
      limit(5)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      sessionsList.innerHTML = '<p class="no-sessions">No recent sessions found.</p>';
      return;
    }

    let sessionsHTML = '';

    querySnapshot.forEach((doc) => {
      const session = doc.data();
      const date = session.createdAt ? new Date(session.createdAt.toDate()).toLocaleDateString() : "Date not available";
      const hasStarted = session.currentQuestionIndex > 0;
      const isCompleted = session.status === "completed";

      sessionsHTML += `
        <div class="session-card">
          <div class="session-info">
            <h3>${session.title}</h3>
            <div class="session-meta">
              <span class="session-type">${session.interviewType || "Interview"}</span>
              <span class="session-date">${date}</span>
              <span class="session-status ${session.status}">${session.status}</span>
            </div>
            <p class="session-role">${session.jobRole} (${session.experienceLevel})</p>
          </div>
          <div class="session-actions">
            ${
              isCompleted
                ? `<a href="feedback.html?id=${doc.id}" class="btn btn-primary btn-sm">View Results</a>`
                : hasStarted
                ? `<a href="interview-room.html?id=${doc.id}" class="btn btn-outline btn-sm">Continue Interview</a>`
                : `<a href="interview-room.html?id=${doc.id}" class="btn btn-primary btn-sm">Start Interview</a>`
            }
          </div>
        </div>
      `;
    });

    sessionsList.innerHTML = sessionsHTML;
  } catch (error) {
    console.error("Error loading sessions:", error);
    sessionsList.innerHTML = '<p class="no-sessions">Error loading sessions.</p>';
  }
}
