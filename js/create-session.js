import { auth } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { authInitialized } from "./auth-check.js";

const GEMINI_API_KEY = "AIzaSyDvpOmdzcaLw1NIRtsNu1blC60-MLAUDO8";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

document.addEventListener("DOMContentLoaded", async () => {
    // Wait for auth to be initialized
    await authInitialized;

    // User profile dropdown
    const userProfile = document.getElementById("user-profile")
    const dropdownMenu = document.getElementById("dropdown-menu")
    const userName = document.getElementById("user-name")
    const userAvatar = document.getElementById("user-avatar")
  
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
  
    // Listen for auth state changes
    onAuthStateChanged(auth, (user) => {
      console.log("Auth state changed:", user ? "User logged in" : "No user");
      if (user) {
        console.log("User details:", {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName
        });
        // Update user profile
        if (userName) {
          userName.textContent = user.displayName || "User"
        }
    
        if (userAvatar && user.photoURL) {
          userAvatar.src = user.photoURL
        }
      }
    });
  
    // Create session form
    const createSessionForm = document.getElementById("create-session-form")
    const loadingModal = document.getElementById("loading-modal")
  
    if (createSessionForm) {
      createSessionForm.addEventListener("submit", async (e) => {
        e.preventDefault()
  
        // Show loading modal
        if (loadingModal) {
          loadingModal.classList.add("active")
        }
  
        try {
          // Get form values
          const sessionTitle = document.getElementById("session-title").value
          const jobRole = document.getElementById("job-role").value
          const experienceLevel = document.getElementById("experience-level").value
          const interviewType = document.getElementById("interview-type").value
          const specificSkills = document.getElementById("specific-skills").value
          const additionalInfo = document.getElementById("additional-info").value
  
          // Generate a random session code
          const sessionCode = generateSessionCode()
  
          // Get current user
          const user = auth.currentUser
          if (!user) {
            throw new Error("No user logged in")
          }
  
          // Generate interview questions using Gemini API
          let questions;
          try {
            questions = await generateInterviewQuestions(jobRole, experienceLevel, interviewType, specificSkills, additionalInfo);
            console.log("Questions generated successfully:", questions);
          } catch (error) {
            console.error("Error generating questions with Gemini API:", error);
            questions = getMockQuestions(interviewType, jobRole);
            console.log("Falling back to mock questions:", questions);
          }
  
          // Create session data
          const sessionData = {
            title: sessionTitle,
            jobRole: jobRole,
            experienceLevel: experienceLevel,
            interviewType: interviewType,
            specificSkills: specificSkills,
            additionalInfo: additionalInfo,
            code: sessionCode,
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
            participants: [
              {
                uid: user.uid,
                name: user.displayName || "Anonymous",
                role: "host",
              },
            ],
            status: "active",
            currentQuestionIndex: 0,
            answers: [],
            questions: questions
          };
  
          // Store session data in sessionStorage
          const sessions = JSON.parse(sessionStorage.getItem('sessions') || '[]');
          sessions.push(sessionData);
          sessionStorage.setItem('sessions', JSON.stringify(sessions));
          sessionStorage.setItem('currentSessionId', sessionCode);
  
          console.log("Session created successfully with code:", sessionCode);
  
          // Keep the loading modal visible for a moment before redirecting
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1000);
        } catch (error) {
          console.error("Error creating session:", error);
          alert("Error creating session. Please try again. " + error.message);
          if (loadingModal) {
            loadingModal.classList.remove("active");
          }
        }
      })
    }
  })
  
  // Generate interview questions using Gemini API
  async function generateInterviewQuestions(jobRole, experienceLevel, interviewType, specificSkills, additionalInfo) {
    const prompt = `
      Generate 5 interview questions for a ${experienceLevel} ${jobRole} position.
      Interview type: ${interviewType}
      ${specificSkills ? `Specific skills to focus on: ${specificSkills}` : ""}
      ${additionalInfo ? `Additional context: ${additionalInfo}` : ""}
      
      For each question, provide:
      1. The question itself
      2. An expected answer that demonstrates proficiency
      3. Specific evaluation criteria for the interviewer
      
      Format the response as a JSON array of objects with the following structure:
      [
        {
          "question": "The interview question",
          "expectedAnswer": "What a good answer should include",
          "evaluationCriteria": "What the interviewer should look for"
        }
      ]
    `;
  
    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      const generatedText = data.candidates[0].content.parts[0].text;
      
      try {
        // Try to parse the response as JSON
        const questions = JSON.parse(generatedText);
        return questions;
      } catch (e) {
        console.error("Error parsing Gemini response:", e);
        // Extract questions using regex if JSON parsing fails
        const questionRegex = /"question":\s*"([^"]+)"/g;
        const answerRegex = /"expectedAnswer":\s*"([^"]+)"/g;
        const criteriaRegex = /"evaluationCriteria":\s*"([^"]+)"/g;
        
        const questions = [];
        let match;
        while ((match = questionRegex.exec(generatedText)) !== null) {
          questions.push({
            question: match[1],
            expectedAnswer: (answerRegex.exec(generatedText) || [])[1] || "Not provided",
            evaluationCriteria: (criteriaRegex.exec(generatedText) || [])[1] || "Not provided"
          });
        }
        
        return questions.length > 0 ? questions : getMockQuestions(interviewType, jobRole);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return getMockQuestions(interviewType, jobRole);
    }
  }
  
  // Generate a random session code (6 characters)
  function generateSessionCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let code = ""
  
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  
    return code
  }
  
  // Mock questions generator
  function getMockQuestions(interviewType, jobRole) {
    if (interviewType === "technical") {
      return [
        {
          question: `As a ${jobRole}, how would you approach debugging a complex issue in production?`,
          expectedAnswer: "A good answer would include systematic approaches to debugging, tools they would use, and how they would prioritize user impact while investigating. They should mention logging, monitoring, and potentially reproducing the issue in a test environment.",
          evaluationCriteria: "Look for structured thinking, knowledge of debugging tools, and consideration of business impact."
        },
        {
          question: `What are the key considerations when designing a scalable system?`,
          expectedAnswer: "The answer should cover load balancing, caching strategies, database optimization, and horizontal vs vertical scaling approaches.",
          evaluationCriteria: "Evaluate understanding of system design principles and scalability concepts."
        },
        {
          question: `Explain your approach to code review and ensuring code quality.`,
          expectedAnswer: "Should discuss code review best practices, automated testing, CI/CD, and coding standards.",
          evaluationCriteria: "Look for emphasis on collaboration, quality, and automation."
        },
        {
          question: `How do you handle technical debt in your projects?`,
          expectedAnswer: "Should discuss strategies for identifying, documenting, and systematically addressing technical debt while balancing new feature development.",
          evaluationCriteria: "Assess pragmatic approach to maintenance and improvement."
        },
        {
          question: `Describe a challenging technical problem you've solved recently.`,
          expectedAnswer: "Should provide a clear problem statement, approach to solving it, and lessons learned.",
          evaluationCriteria: "Evaluate problem-solving process and communication skills."
        }
      ];
    } else if (interviewType === "behavioral") {
      return [
        {
          question: `Tell me about a time when you had to work with a difficult team member.`,
          expectedAnswer: "Should demonstrate conflict resolution skills, empathy, and focus on positive outcomes.",
          evaluationCriteria: "Look for emotional intelligence and problem-solving approach."
        },
        {
          question: `Describe a situation where you had to make a difficult decision.`,
          expectedAnswer: "Should show decision-making process, consideration of alternatives, and learning from the experience.",
          evaluationCriteria: "Evaluate decision-making framework and reflection."
        },
        {
          question: `How do you handle stress and pressure in the workplace?`,
          expectedAnswer: "Should demonstrate self-awareness, coping strategies, and maintaining performance under pressure.",
          evaluationCriteria: "Assess stress management and resilience."
        },
        {
          question: `Tell me about a time when you had to adapt to a significant change.`,
          expectedAnswer: "Should show flexibility, learning ability, and positive attitude towards change.",
          evaluationCriteria: "Look for adaptability and growth mindset."
        },
        {
          question: `Describe a situation where you had to take initiative.`,
          expectedAnswer: "Should demonstrate proactivity, leadership, and impact of their actions.",
          evaluationCriteria: "Evaluate initiative and leadership potential."
        }
      ];
    }
    return [];
  }
  