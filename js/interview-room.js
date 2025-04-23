document.addEventListener("DOMContentLoaded", () => {
  // Initialize Firebase (assuming firebase-config.js is loaded)
  // Firebase is assumed to be initialized in firebase-config.js
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

  // Session data
  let sessionData = null
  let currentQuestionIndex = 0
  let userAnswers = []
  let isRecording = false
  let mediaRecorder = null
  let audioChunks = []
  let recordingStartTime = null
  let timerInterval = null

  // DOM elements
  const sessionTitle = document.getElementById("session-title")
  const progressFill = document.getElementById("progress-fill")
  const currentQuestionNum = document.getElementById("current-question-num")
  const totalQuestions = document.getElementById("total-questions")
  const questionText = document.getElementById("question-text")
  const questionTimer = document.getElementById("question-timer")
  const answerStatus = document.getElementById("answer-status")
  const startRecordingBtn = document.getElementById("start-recording-btn")
  const stopRecordingBtn = document.getElementById("stop-recording-btn")
  const answerText = document.getElementById("answer-text")
  const saveAnswerBtn = document.getElementById("save-answer-btn")
  const editAnswerBtn = document.getElementById("edit-answer-btn")
  const prevQuestionBtn = document.getElementById("prev-question-btn")
  const nextQuestionBtn = document.getElementById("next-question-btn")
  const finishInterviewBtn = document.getElementById("finish-interview-btn")
  const loadingModal = document.getElementById("loading-modal")

  // Load session data
  loadSessionData(sessionId)

  // Initialize webcam
  initializeWebcam()

  // Event listeners
  if (startRecordingBtn) {
    startRecordingBtn.addEventListener("click", startRecording)
  }

  if (stopRecordingBtn) {
    stopRecordingBtn.addEventListener("click", stopRecording)
  }

  if (saveAnswerBtn) {
    saveAnswerBtn.addEventListener("click", saveAnswer)
  }

  if (editAnswerBtn) {
    editAnswerBtn.addEventListener("click", () => {
      answerText.focus()
    })
  }

  if (prevQuestionBtn) {
    prevQuestionBtn.addEventListener("click", goToPreviousQuestion)
  }

  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener("click", goToNextQuestion)
  }

  if (finishInterviewBtn) {
    finishInterviewBtn.addEventListener("click", finishInterview)
  }

  // Share session modal
  const shareBtn = document.getElementById("share-btn")
  const shareModal = document.getElementById("share-modal")
  const closeModalBtns = document.querySelectorAll(".close-modal")

  if (shareBtn && shareModal) {
    shareBtn.addEventListener("click", () => {
      // Display session code
      const sessionCodeDisplay = document.getElementById("session-code-display")
      if (sessionCodeDisplay && sessionData) {
        sessionCodeDisplay.value = sessionData.code
      }

      shareModal.classList.add("active")
    })

    closeModalBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        shareModal.classList.remove("active")
        document.getElementById("end-session-modal").classList.remove("active")
      })
    })

    // Close modal when clicking outside
    window.addEventListener("click", (event) => {
      if (event.target === shareModal) {
        shareModal.classList.remove("active")
      }
      if (event.target === document.getElementById("end-session-modal")) {
        document.getElementById("end-session-modal").classList.remove("active")
      }
    })
  }

  // Copy session code
  const copyCodeBtn = document.getElementById("copy-code-btn")
  if (copyCodeBtn) {
    copyCodeBtn.addEventListener("click", function () {
      const sessionCodeDisplay = document.getElementById("session-code-display")
      sessionCodeDisplay.select()
      document.execCommand("copy")

      // Change button text temporarily
      const originalText = this.textContent
      this.textContent = "Copied!"
      setTimeout(() => {
        this.textContent = originalText
      }, 2000)
    })
  }

  // End session modal
  const endSessionBtn = document.getElementById("end-session-btn")
  const endSessionModal = document.getElementById("end-session-modal")

  if (endSessionBtn && endSessionModal) {
    endSessionBtn.addEventListener("click", () => {
      endSessionModal.classList.add("active")
    })

    // Cancel end session
    const cancelEndBtn = document.getElementById("cancel-end-btn")
    if (cancelEndBtn) {
      cancelEndBtn.addEventListener("click", () => {
        endSessionModal.classList.remove("active")
      })
    }

    // Confirm end session
    const confirmEndBtn = document.getElementById("confirm-end-btn")
    if (confirmEndBtn) {
      confirmEndBtn.addEventListener("click", () => {
        endSession(sessionId)
      })
    }
  }

  // Toggle video/audio buttons
  const toggleVideoBtn = document.getElementById("toggle-video-btn")
  const toggleAudioBtn = document.getElementById("toggle-audio-btn")

  if (toggleVideoBtn) {
    toggleVideoBtn.addEventListener("click", toggleVideo)
  }

  if (toggleAudioBtn) {
    toggleAudioBtn.addEventListener("click", toggleAudio)
  }

  // Load session data
  async function loadSessionData(sessionId) {
    try {
      const doc = await db.collection("sessions").doc(sessionId).get()

      if (!doc.exists) {
        alert("Session not found")
        window.location.href = "dashboard.html"
        return
      }

      sessionData = doc.data()

      // Update session title
      if (sessionTitle) {
        sessionTitle.textContent = sessionData.title
      }

      // Load participants
      loadParticipants(sessionData.participants)

      // Check if user is authorized to access this session
      const user = auth.currentUser
      const isParticipant = sessionData.participants.some((p) => p.uid === user.uid)

      if (!isParticipant) {
        alert("You are not authorized to access this session")
        window.location.href = "dashboard.html"
        return
      }

      // Initialize questions
      if (sessionData.questions && sessionData.questions.length > 0) {
        // Initialize user answers array
        userAnswers = new Array(sessionData.questions.length).fill(null)

        // Update total questions
        if (totalQuestions) {
          totalQuestions.textContent = sessionData.questions.length
        }

        // Display first question
        displayQuestion(0)
      } else {
        alert("No questions found for this interview")
        window.location.href = "dashboard.html"
      }

      // Listen for session updates
      listenForSessionUpdates(sessionId)
    } catch (error) {
      console.error("Error loading session:", error)
      alert("Error loading session. Please try again.")
      window.location.href = "dashboard.html"
    }
  }

  // Load participants
  function loadParticipants(participants) {
    const participantsList = document.getElementById("participants-list")

    if (!participantsList) return

    let participantsHTML = ""

    participants.forEach((participant) => {
      participantsHTML += `
                <div class="participant">
                    <img src="images/default-avatar.svg" alt="${participant.name}">
                    <div class="participant-info">
                        <div class="participant-name">${participant.name}</div>
                        <div class="participant-role">${participant.role}</div>
                    </div>
                </div>
            `
    })

    participantsList.innerHTML = participantsHTML
  }

  // Listen for session updates
  function listenForSessionUpdates(sessionId) {
    db.collection("sessions")
      .doc(sessionId)
      .onSnapshot(
        (doc) => {
          if (!doc.exists) {
            alert("Session has been deleted")
            window.location.href = "dashboard.html"
            return
          }

          const updatedData = doc.data()

          // Update session data
          sessionData = updatedData

          // Update participants
          loadParticipants(updatedData.participants)

          // Check if session has ended
          if (updatedData.status === "ended") {
            alert("This session has ended")
            window.location.href = "dashboard.html"
          }
        },
        (error) => {
          console.error("Error listening for session updates:", error)
        },
      )
  }

  // Display question
  function displayQuestion(index) {
    if (!sessionData || !sessionData.questions || index >= sessionData.questions.length) {
      return
    }

    currentQuestionIndex = index
    const question = sessionData.questions[index]

    // Update question text
    if (questionText) {
      questionText.textContent = question.question
    }

    // Update progress
    if (progressFill && totalQuestions) {
      const progress = ((index + 1) / sessionData.questions.length) * 100
      progressFill.style.width = `${progress}%`
      currentQuestionNum.textContent = index + 1
    }

    // Update navigation buttons
    if (prevQuestionBtn) {
      prevQuestionBtn.disabled = index === 0
    }

    if (nextQuestionBtn && finishInterviewBtn) {
      if (index === sessionData.questions.length - 1) {
        nextQuestionBtn.style.display = "none"
        finishInterviewBtn.style.display = "block"
      } else {
        nextQuestionBtn.style.display = "block"
        finishInterviewBtn.style.display = "none"
      }
    }

    // Display saved answer if exists
    if (answerText) {
      answerText.textContent = userAnswers[index] || ""
    }

    // Reset recording state
    resetRecordingState()
  }

  // Initialize webcam
  function initializeWebcam() {
    const webcamPreview = document.getElementById("webcam-preview")

    if (!webcamPreview) return

    // Request access to webcam
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        webcamPreview.srcObject = stream
        window.localStream = stream // Store stream for later use
      })
      .catch((error) => {
        console.error("Error accessing webcam:", error)
        // Show placeholder instead
        webcamPreview.poster = "images/webcam-placeholder.svg"
      })
  }

  // Toggle video
  function toggleVideo() {
    const webcamPreview = document.getElementById("webcam-preview")
    const toggleVideoBtn = document.getElementById("toggle-video-btn")

    if (!webcamPreview || !toggleVideoBtn || !window.localStream) return

    const videoTracks = window.localStream.getVideoTracks()

    if (videoTracks.length === 0) return

    const isEnabled = videoTracks[0].enabled

    // Toggle video track
    videoTracks[0].enabled = !isEnabled

    // Update button icon
    toggleVideoBtn.innerHTML = videoTracks[0].enabled
      ? '<img src="images/video-icon.svg" alt="Toggle Video">'
      : '<img src="images/video-off-icon.svg" alt="Toggle Video">'
  }

  // Toggle audio
  function toggleAudio() {
    const toggleAudioBtn = document.getElementById("toggle-audio-btn")

    if (!toggleAudioBtn || !window.localStream) return

    const audioTracks = window.localStream.getAudioTracks()

    if (audioTracks.length === 0) return

    const isEnabled = audioTracks[0].enabled

    // Toggle audio track
    audioTracks[0].enabled = !isEnabled

    // Update button icon
    toggleAudioBtn.innerHTML = audioTracks[0].enabled
      ? '<img src="images/mic-icon.svg" alt="Toggle Audio">'
      : '<img src="images/mic-off-icon.svg" alt="Toggle Audio">'
  }

  // Start recording
  function startRecording() {
    if (isRecording) return

    // Check if browser supports MediaRecorder
    if (!window.MediaRecorder) {
      alert("Your browser doesn't support audio recording. Please use Chrome, Firefox, or Edge.")
      return
    }

    // Get audio stream
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        isRecording = true
        audioChunks = []

        // Create media recorder
        mediaRecorder = new MediaRecorder(stream)

        // Handle data available event
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data)
          }
        }

        // Handle recording stop
        mediaRecorder.onstop = () => {
          // Convert audio chunks to blob
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" })

          // Transcribe audio (in a real app, this would call a speech-to-text API)
          transcribeAudio(audioBlob)

          // Release microphone
          stream.getTracks().forEach((track) => track.stop())
        }

        // Start recording
        mediaRecorder.start()
        recordingStartTime = Date.now()

        // Update UI
        updateRecordingUI(true)

        // Start timer
        startTimer()
      })
      .catch((error) => {
        console.error("Error accessing microphone:", error)
        alert("Error accessing microphone. Please check your permissions.")
      })
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording || !mediaRecorder) return

    // Stop media recorder
    mediaRecorder.stop()
    isRecording = false

    // Update UI
    updateRecordingUI(false)

    // Stop timer
    stopTimer()
  }

  // Update recording UI
  function updateRecordingUI(isRecording) {
    if (startRecordingBtn) {
      startRecordingBtn.disabled = isRecording
    }

    if (stopRecordingBtn) {
      stopRecordingBtn.disabled = !isRecording
    }

    const statusIndicator = document.querySelector(".status-indicator")
    if (statusIndicator) {
      if (isRecording) {
        statusIndicator.classList.add("recording")
        statusIndicator.innerHTML = '<span class="recording-dot"></span> Recording your answer...'
      } else {
        statusIndicator.classList.remove("recording")
        statusIndicator.textContent = "Recording stopped"
      }
    }
  }

  // Reset recording state
  function resetRecordingState() {
    isRecording = false

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }

    updateRecordingUI(false)
    stopTimer()

    const timer = document.querySelector(".timer")
    if (timer) {
      timer.textContent = "00:00"
    }
  }

  // Start timer
  function startTimer() {
    const timer = document.querySelector(".timer")
    if (!timer) return

    // Clear existing interval
    if (timerInterval) {
      clearInterval(timerInterval)
    }

    // Reset start time
    recordingStartTime = Date.now()

    // Start new interval
    timerInterval = setInterval(() => {
      const elapsedTime = Date.now() - recordingStartTime
      const seconds = Math.floor((elapsedTime / 1000) % 60)
        .toString()
        .padStart(2, "0")
      const minutes = Math.floor((elapsedTime / 1000 / 60) % 60)
        .toString()
        .padStart(2, "0")

      timer.textContent = `${minutes}:${seconds}`
    }, 1000)
  }

  // Stop timer
  function stopTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  // Transcribe audio (mock implementation)
  function transcribeAudio(audioBlob) {
    // In a real implementation, this would call a speech-to-text API
    // For this example, we'll simulate the API call with a delay

    // Show loading state
    if (answerText) {
      answerText.textContent = "Transcribing your answer..."
    }

    // Simulate API delay
    setTimeout(() => {
      // Generate mock transcription based on the current question
      const question = sessionData.questions[currentQuestionIndex]
      let mockTranscription = ""

      if (question) {
        // Generate a simple mock response based on the question
        if (question.question.includes("experience") || question.question.includes("yourself")) {
          mockTranscription =
            "I have about 5 years of experience in this field. I started my career at a small startup where I learned to wear many hats and developed a strong foundation. Later, I moved to a larger company where I specialized more deeply and worked on larger-scale projects."
        } else if (question.question.includes("challenge") || question.question.includes("difficult")) {
          mockTranscription =
            "One significant challenge I faced was when our team had to migrate a legacy system to a modern architecture with minimal downtime. I led the technical planning and created a phased approach that allowed us to make the transition smoothly while maintaining service for our customers."
        } else if (question.question.includes("strength") || question.question.includes("weakness")) {
          mockTranscription =
            "My greatest strength is my ability to solve complex problems by breaking them down into manageable parts. I'm also very collaborative and enjoy working with cross-functional teams. As for weaknesses, I sometimes get too focused on perfecting details, but I've learned to balance this with pragmatism and meeting deadlines."
        } else {
          mockTranscription =
            "I believe my experience and skills align well with what you're looking for. I'm particularly interested in this role because it allows me to combine my technical expertise with my passion for creating user-friendly solutions. I'm excited about the opportunity to contribute to your team and continue growing professionally."
        }
      }

      // Update answer text
      if (answerText) {
        answerText.textContent = mockTranscription
      }
    }, 2000)
  }

  // Save answer
  function saveAnswer() {
    if (!answerText) return

    // Save current answer
    userAnswers[currentQuestionIndex] = answerText.textContent

    // Show confirmation
    const originalText = saveAnswerBtn.textContent
    saveAnswerBtn.textContent = "Saved!"
    setTimeout(() => {
      saveAnswerBtn.textContent = originalText
    }, 2000)
  }

  // Go to previous question
  function goToPreviousQuestion() {
    if (currentQuestionIndex > 0) {
      // Save current answer
      if (answerText) {
        userAnswers[currentQuestionIndex] = answerText.textContent
      }

      // Display previous question
      displayQuestion(currentQuestionIndex - 1)
    }
  }

  // Go to next question
  function goToNextQuestion() {
    if (currentQuestionIndex < sessionData.questions.length - 1) {
      // Save current answer
      if (answerText) {
        userAnswers[currentQuestionIndex] = answerText.textContent
      }

      // Display next question
      displayQuestion(currentQuestionIndex + 1)
    }
  }

  // Finish interview
  async function finishInterview() {
    // Save final answer
    if (answerText) {
      userAnswers[currentQuestionIndex] = answerText.textContent
    }

    // Show loading modal
    loadingModal.classList.add("active")

    try {
      // Generate feedback using Gemini API
      const feedback = await generateFeedback(sessionData.questions, userAnswers)

      // Save interview results to Firestore
      await saveInterviewResults(sessionId, userAnswers, feedback)

      // Redirect to feedback page
      window.location.href = `feedback.html?id=${sessionId}`
    } catch (error) {
      console.error("Error finishing interview:", error)
      alert("Error processing interview results. Please try again.")
      loadingModal.classList.remove("active")
    }
  }

  // Generate feedback using Gemini API (mock implementation)
  async function generateFeedback(questions, answers) {
    // In a real implementation, this would call the Gemini API
    // For this example, we'll simulate the API call with a delay and return mock feedback

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Create prompt for Gemini
    const prompt = `
            I have completed a job interview with the following questions and my answers.
            Please provide feedback on each answer and an overall assessment.
            
            ${questions
              .map(
                (q, i) => `
                Question ${i + 1}: ${q.question}
                My Answer: ${answers[i] || "No answer provided"}
                Expected Answer: ${q.expectedAnswer}
            `,
              )
              .join("\n\n")}
            
            For each question, please provide:
            1. A score out of 10
            2. Specific feedback on what was good
            3. Areas for improvement
            
            Also provide an overall assessment with:
            1. Overall score
            2. Key strengths
            3. Areas for improvement
            4. Suggestions for future interviews
        `

    console.log("Gemini API Prompt for Feedback:", prompt)

    // Mock feedback
    const mockFeedback = {
      overall: {
        score: 7.5,
        summary:
          "You demonstrated good knowledge and experience in your responses. Your answers were generally clear and structured, though some could benefit from more specific examples and quantifiable results. You showed enthusiasm and a good understanding of the role requirements.",
        strengths: [
          "Clear communication style",
          "Good structure in most answers",
          "Demonstrated relevant experience",
          "Showed enthusiasm for the role",
        ],
        improvements: [
          "Include more specific, quantifiable results in your examples",
          "Be more concise in some responses",
          "Prepare more tailored examples for common questions",
          "Practice more technical explanations if applicable to the role",
        ],
      },
      questions: questions.map((q, i) => {
        // Generate random score between 6 and 9
        const score = Math.floor(Math.random() * 4) + 6

        return {
          question: q.question,
          userAnswer: answers[i] || "No answer provided",
          expectedAnswer: q.expectedAnswer,
          score: score,
          feedback:
            score >= 8
              ? "Strong answer that covered most key points. You demonstrated good understanding and provided relevant examples."
              : "Solid answer but could be improved with more specific examples and clearer structure. Consider quantifying your achievements more.",
          improvements:
            score >= 8
              ? "To make this answer even stronger, consider adding more specific metrics or results to demonstrate impact."
              : "Focus on structuring your answer using the STAR method (Situation, Task, Action, Result) and include specific metrics where possible.",
        }
      }),
    }

    return mockFeedback
  }

  // Save interview results to Firestore
  async function saveInterviewResults(sessionId, answers, feedback) {
    const user = auth.currentUser

    // Save results to Firestore
    await db
      .collection("sessions")
      .doc(sessionId)
      .collection("results")
      .doc(user.uid)
      .set({
        userId: user.uid,
        userName: user.displayName || "Anonymous",
        answers: answers,
        feedback: feedback,
        completedAt: new Date(),
      })

    // Update session status
    await db.collection("sessions").doc(sessionId).update({
      status: "completed",
      completedAt: new Date(),
    })
  }

  // End session
  function endSession(sessionId) {
    db.collection("sessions")
      .doc(sessionId)
      .update({
        status: "ended",
        endedAt: new Date(),
      })
      .then(() => {
        alert("Session ended successfully")
        window.location.href = "dashboard.html"
      })
      .catch((error) => {
        console.error("Error ending session:", error)
        alert("Error ending session. Please try again.")
      })
  }
})
