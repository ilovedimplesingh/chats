const chatContainer = document.getElementById("chat-container");
const viewerSelect = document.getElementById("viewer");

let VIEWER = viewerSelect.value;

// File types
const imageExt = [".jpg", ".jpeg", ".png", ".webp"];
const videoExt = [".mp4", ".webm", ".ogg"];
const docExt = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"];

viewerSelect.addEventListener("change", () => {
  VIEWER = viewerSelect.value;
  loadChat(); // reload chat
});

function getFileType(message) {
  const lower = message.toLowerCase();

  if (imageExt.some(ext => lower.endsWith(ext))) return "image";
  if (videoExt.some(ext => lower.endsWith(ext))) return "video";
  if (docExt.some(ext => lower.endsWith(ext))) return "doc";

  return "text";
}

function loadChat() {
  chatContainer.innerHTML = "";

  fetch("chats/chat.txt")
    .then(res => res.text())
    .then(data => {
      const lines = data.split("\n");

      const regex = /^(\d{2}\/\d{2}\/\d{4}), (\d{1,2}:\d{2}) - (.*?): (.*)$/;

      lines.forEach(line => {
        const match = line.match(regex);

        if (match) {
          const time = match[2];
          const sender = match[3];
          const message = match[4].trim();

          createMessage(sender, message, time);
        }
      });
    });
}

function createMessage(sender, message, time) {
  const msgDiv = document.createElement("div");

  msgDiv.classList.add("message");

  const isViewer = sender === VIEWER;

  msgDiv.classList.add(isViewer ? "me" : "other");

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
    link.style.color = "#53bdeb";
    msgDiv.appendChild(link);
  }

  else {
    msgDiv.innerHTML = message;
  }

  // ⏰ time
  const timeDiv = document.createElement("div");
  timeDiv.className = "time";
  timeDiv.innerText = time;

  msgDiv.appendChild(timeDiv);

  chatContainer.appendChild(msgDiv);
}

// initial load
loadChat();
  chatContainer.appendChild(msgDiv);
}
