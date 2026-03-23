const chatContainer = document.getElementById("chat-container");
const viewerSelect = document.getElementById("viewer");

// NEW UI elements
const dp = document.getElementById("dp");
const chatName = document.getElementById("chat-name");
const scrollBtn = document.getElementById("scroll-bottom");
const floatingDate = document.getElementById("floating-date");

// viewer
let VIEWER = viewerSelect ? viewerSelect.value : "Mehul";

// update header
function updateHeader() {
  if (!dp || !chatName) return;

  if (VIEWER === "Mehul") {
    chatName.innerText = "Dimp";
    dp.src = "media/dimp.jpg";
  } else {
    chatName.innerText = "Mehul";
    dp.src = "media/mehul.jpg";
  }
}

updateHeader();

if (viewerSelect) {
  viewerSelect.addEventListener("change", () => {
    VIEWER = viewerSelect.value;
    updateHeader();
    resetChat();
  });
}

let allMessages = [];
let currentIndex = 0;
const CHUNK_SIZE = 200;

// file types
const imageExt = [".jpg", ".jpeg", ".png", ".webp"];
const videoExt = [".mp4", ".webm", ".ogg", ".opus"];
const docExt = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"];

// FILES
const files = ["chat1.txt", "chat2.txt", "chat3.txt", "chat4.txt", "chat5.txt"];

// detect file type
function getFileType(message) {
  const lower = message.toLowerCase();
  if (imageExt.some(ext => lower.endsWith(ext))) return "image";
  if (videoExt.some(ext => lower.endsWith(ext))) return "video";
  if (docExt.some(ext => lower.endsWith(ext))) return "doc";
  return "text";
}

// LOAD FILES
async function loadAllChats() {
  let combinedData = "";

  for (let file of files) {
    try {
      const res = await fetch("chats/" + file);
      console.log("Fetching:", file, "Status:", res.status);

      if (!res.ok) continue;

      const text = await res.text();
      combinedData += text + "\n";

    } catch (err) {
      console.error("Error loading:", file, err);
    }
  }

  if (!combinedData) return;

  // fix merged lines
  combinedData = combinedData.replace(
    /(\d{2}\/\d{2}\/\d{4}, \d{1,2}:\d{2} - )/g,
    "\n$1"
  );

  allMessages = parseChat(combinedData);
  console.log("TOTAL MESSAGES:", allMessages.length);

  resetChat();
}

// START
loadAllChats();

// PARSER (now includes date)
function parseChat(data) {
  const lines = data.split("\n");
  const regex = /^(.+?), (.+?) - (.*?): (.*)$/;

  return lines
    .map(line => {
      const match = line.match(regex);
      if (!match) return null;

      return {
        date: match[1],
        time: match[2],
        sender: match[3],
        message: match[4].trim()
      };
    })
    .filter(Boolean);
}

// reset
function resetChat() {
  chatContainer.innerHTML = "";
  currentIndex = allMessages.length;
  lastDate = null;
  loadInitialMessages();
}

// date tracking
let lastDate = null;

// load newest
function loadInitialMessages() {
  const start = Math.max(0, currentIndex - CHUNK_SIZE);
  const slice = allMessages.slice(start, currentIndex);

  slice.forEach(msg => renderWithDate(msg, false));

  currentIndex = start;
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// scroll
chatContainer.addEventListener("scroll", () => {
  if (chatContainer.scrollTop <= 10) loadOlderMessages();

  // scroll button
  if (scrollBtn) {
    if (chatContainer.scrollTop < chatContainer.scrollHeight - 600) {
      scrollBtn.style.display = "block";
    } else {
      scrollBtn.style.display = "none";
    }
  }

  // floating date
  if (floatingDate) {
    const visible = document.querySelector(".date-separator");
    if (visible) {
      floatingDate.innerText = visible.innerText;
      floatingDate.style.display = "block";

      clearTimeout(window.dateTimeout);
      window.dateTimeout = setTimeout(() => {
        floatingDate.style.display = "none";
      }, 1000);
    }
  }
});

// load older
function loadOlderMessages() {
  if (currentIndex <= 0) return;

  const prevHeight = chatContainer.scrollHeight;

  const start = Math.max(0, currentIndex - CHUNK_SIZE);
  const slice = allMessages.slice(start, currentIndex);

  slice.reverse().forEach(msg => renderWithDate(msg, true));

  currentIndex = start;
  chatContainer.scrollTop = chatContainer.scrollHeight - prevHeight;
}

// render with date separator
function renderWithDate(msg, prepend) {
  if (msg.date !== lastDate) {
    const dateDiv = document.createElement("div");
    dateDiv.className = "date-separator";
    dateDiv.innerText = msg.date;

    if (prepend) chatContainer.prepend(dateDiv);
    else chatContainer.appendChild(dateDiv);

    lastDate = msg.date;
  }

  createMessage(msg.sender, msg.message, msg.time, prepend);
}

// create message
function createMessage(sender, message, time, prepend) {
  const msgDiv = document.createElement("div");

  const isViewer = sender === VIEWER;
  msgDiv.className = "message " + (isViewer ? "me" : "other");

  const fileType = getFileType(message);
  const filePath = "media/" + message;

  if (fileType === "image") {
    const img = document.createElement("img");
    img.src = filePath;

    // fullscreen
    img.onclick = () => {
      const overlay = document.createElement("div");
      overlay.className = "overlay";
      overlay.innerHTML = `<img src="${filePath}">`;
      overlay.onclick = () => overlay.remove();
      document.body.appendChild(overlay);
    };

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
    msgDiv.textContent = message;
  }

  const timeDiv = document.createElement("div");
  timeDiv.className = "time";
  timeDiv.innerText = time;

  msgDiv.appendChild(timeDiv);

  if (prepend) chatContainer.prepend(msgDiv);
  else chatContainer.appendChild(msgDiv);
}

// scroll button click
if (scrollBtn) {
  scrollBtn.onclick = () => {
    chatContainer.scrollTop = chatContainer.scrollHeight;
  };
}

// SEARCH
const searchInput = document.getElementById("search");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    const value = e.target.value.toLowerCase();

    document.querySelectorAll(".message").forEach(msg => {
      msg.style.display = msg.innerText.toLowerCase().includes(value)
        ? "block"
        : "none";
    });
  });
}
