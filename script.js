const chatContainer = document.getElementById("chat-container");
const viewerSelect = document.getElementById("viewer");

let VIEWER = viewerSelect.value;
let allMessages = [];
let currentIndex = 0;
const CHUNK_SIZE = 200;

// File types
const imageExt = [".jpg", ".jpeg", ".png", ".webp"];
const videoExt = [".mp4", ".webm", ".ogg"];
const docExt = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"];

viewerSelect.addEventListener("change", () => {
  VIEWER = viewerSelect.value;
  resetChat();
});

function getFileType(message) {
  const lower = message.toLowerCase();

  if (imageExt.some(ext => lower.endsWith(ext))) return "image";
  if (videoExt.some(ext => lower.endsWith(ext))) return "video";
  if (docExt.some(ext => lower.endsWith(ext))) return "doc";

  return "text";
}

// 🔥 Load chat file
const files = ["chat1.txt"]; // your files

async function loadAllChats() {
  let combinedData = "";

  for (let file of files) {
    try {
      const res = await fetch("chats/" + file);
      const text = await res.text();
      combinedData += text + "\n";
    } catch (err) {
      console.error("Error loading:", file, err);
    }
  }

  console.log("ALL DATA LENGTH:", combinedData.length);

  allMessages = parseChat(combinedData);
  console.log("TOTAL MESSAGES:", allMessages.length);

  resetChat();
}

// 🔥 CALL THIS AT THE END
loadAllChats();

// Parse
function parseChat(data) {
  const lines = data.split("\n");

  const regex = /^(\d{2}\/\d{2}\/\d{4}), (\d{1,2}:\d{2}) - (.*?): (.*)$/;

  return lines
    .map(line => {
      const match = line.match(regex);
      if (!match) return null;

      return {
        time: match[2],
        sender: match[3],
        message: match[4].trim()
      };
    })
    .filter(Boolean);
}

// 🔥 Reset chat (load newest)
function resetChat() {
  chatContainer.innerHTML = "";

  currentIndex = allMessages.length;

  loadInitialMessages();
}

// Load last chunk
function loadInitialMessages() {
  const start = Math.max(0, currentIndex - CHUNK_SIZE);
  const slice = allMessages.slice(start, currentIndex);

  slice.forEach(msg => {
    createMessage(msg.sender, msg.message, msg.time, false);
  });

  currentIndex = start;

  // scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// 🔥 Load older messages on scroll up
chatContainer.addEventListener("scroll", () => {
  if (chatContainer.scrollTop === 0) {
    loadOlderMessages();
  }
});

function loadOlderMessages() {
  if (currentIndex <= 0) return;

  const prevHeight = chatContainer.scrollHeight;

  const start = Math.max(0, currentIndex - CHUNK_SIZE);
  const slice = allMessages.slice(start, currentIndex);

  slice.reverse().forEach(msg => {
    createMessage(msg.sender, msg.message, msg.time, true);
  });

  currentIndex = start;

  // maintain scroll position
  chatContainer.scrollTop = chatContainer.scrollHeight - prevHeight;
}

// Create message
function createMessage(sender, message, time, prepend) {
  const msgDiv = document.createElement("div");

  const isViewer = sender === VIEWER;

  msgDiv.className = "message " + (isViewer ? "me" : "other");

  const fileType = getFileType(message);
  const filePath = "media/" + message;

  if (fileType === "image") {
    const img = document.createElement("img");
    img.src = filePath;
    msgDiv.appendChild(img);
  }

  else if (fileType === "video") {
    const video = document.createElement("video");
    video.src = filePath;
    video.controls = true;
    video.style.maxWidth = "100%";
    msgDiv.appendChild(video);
  }

  else if (fileType === "doc") {
    const link = document.createElement("a");
    link.href = filePath;
    link.innerText = "📄 " + message;
    link.target = "_blank";
    msgDiv.appendChild(link);
  }

  else {
    msgDiv.innerHTML = message;
  }

  const timeDiv = document.createElement("div");
  timeDiv.className = "time";
  timeDiv.innerText = time;

  msgDiv.appendChild(timeDiv);

  // 🔥 prepend or append
  if (prepend) {
    chatContainer.prepend(msgDiv);
  } else {
    chatContainer.appendChild(msgDiv);
  }
}

console.log("FILES:", files);
