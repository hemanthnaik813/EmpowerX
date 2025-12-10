const startVoiceBtn = document.getElementById("startVoiceBtn");
const startGestureBtn = document.getElementById("startGestureBtn");
const stopGestureBtn = document.getElementById("stopGestureBtn");
const subtitleBox = document.getElementById("subtitle-box");
const video = document.getElementById("video");

let mediaStream = null;
let gestureActive = false;
let captureInterval = null;

function show(text) {
    subtitleBox.textContent = text;
}

function speak(text) {
    if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(text);
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
    }
}

/* ---------------- VOICE SEARCH ---------------- */
startVoiceBtn.onclick = () => {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) return alert("Speech Recognition not supported!");

    const recog = new R();
    recog.lang = "en-US";
    recog.interimResults = false;

    recog.start();
    show("Listening...");

    recog.onresult = async (e) => {
        const query = e.results[0][0].transcript;
        show("Searching: " + query);

        const res = await fetch("/search", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query })
        });

        const j = await res.json();
        show(j.summary);
        speak(j.summary);
    };
};

/* ---------------- GESTURE ---------------- */
startGestureBtn.onclick = async () => {
    if (gestureActive) return;
    gestureActive = true;

    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
    video.srcObject = mediaStream;

    captureInterval = setInterval(async () => {
        const frame = captureFrame();
        const res = await fetch("/gesture", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ frame })
        });

        const j = await res.json();
        if (j.text !== "no_hand_detected") {
            show(j.text);
            speak(j.text);
        }
    }, 500);

    show("Gesture mode active");
};

stopGestureBtn.onclick = () => {
    gestureActive = false;
    if (captureInterval) clearInterval(captureInterval);
    if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
    show("Stopped");
};

function captureFrame() {
    const canvas = document.createElement("canvas");
    canvas.width = 400;
    canvas.height = 250;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.6);
}
