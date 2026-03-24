document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const chatContainer = document.getElementById("chat-container");
  const viewerSelect = document.getElementById("viewer");
  const searchInput = document.getElementById("search");
  const searchBox = document.getElementById("search-box");
  const searchUpBtn = document.getElementById("search-up");
  const searchDownBtn = document.getElementById("search-down");
  const searchCloseBtn = document.getElementById("search-close");

  const dp = document.getElementById("dp");
  const chatName = document.getElementById("chat-name");
  const scrollBtn = document.getElementById("scroll-bottom");
  const floatingDate = document.getElementById("floating-date");

  const menuBtn = document.getElementById("menu-btn");
  const headerMenu = document.getElementById("header-menu");
  const menuSearchBtn = document.getElementById("menu-search");

  let VIEWER = viewerSelect ? viewerSelect.value : "Mehul";

  const CHUNK_SIZE = 200;
  const imageExt = [".jpg", ".jpeg", ".png", ".webp"];
  const videoExt = [".mp4", ".webm", ".ogg", ".opus"];
  const docExt = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"];
  const files = ["chat1.txt", "chat2.txt", "chat3.txt", "chat4.txt", "chat5.txt"];

  const viewerWallpapers = {
    Mehul: "media/mehulchat.jpg",
    Dimp: "media/dimpchat.jpg"
  };

  let allMessages = [];
  let filteredMessages = [];
  let currentIndex = 0;
  let dateHideTimer = null;
  let searchMatches = [];
  let activeSearchMatchIndex = -1;

  function updateHeader() {
    if (!dp || !chatName) return;

    if (VIEWER === "Mehul") {
      chatName.innerText = "Dimp";
      dp.src = "media/dimp.jpg";
      dp.alt = "Dimp";
    } else {
      chatName.innerText = "Mehul";
      dp.src = "media/mehul.jpg";
      dp.alt = "Mehul";
    }

    dp.onerror = () => {
      const name = chatName.innerText || "?";
      dp.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=202c33&color=ffffff`;
    };
  }

  function updateWallpaper() {
    if (!app) return;

    const wallpaper = viewerWallpapers[VIEWER] || "";
    app.style.backgroundImage = wallpaper ? `url('${wallpaper}')` : "none";
  }

  function normalizeAttachmentName(rawMessage) {
    let cleaned = rawMessage.trim();

    cleaned = cleaned.replace(/\s*\(file attached\)\s*$/i, "");
    cleaned = cleaned.replace(/^<attached:\s*/i, "").replace(/>$/, "");

    return cleaned.trim();
  }

  function getFileType(message) {
    const cleanMessage = normalizeAttachmentName(message).toLowerCase();

    if (imageExt.some(ext => cleanMessage.endsWith(ext))) return "image";
    if (videoExt.some(ext => cleanMessage.endsWith(ext))) return "video";
    if (docExt.some(ext => cleanMessage.endsWith(ext))) return "doc";
    return "text";
  }

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

  async function loadAllChats() {
    let combinedData = "";

    for (const file of files) {
      try {
        const res = await fetch(`chats/${file}`);
        if (!res.ok) continue;

        combinedData += `${await res.text()}\n`;
      } catch (err) {
        console.error("Error loading:", file, err);
      }
    }

    if (!combinedData) return;

    combinedData = combinedData.replace(/(\d{2}\/\d{2}\/\d{4}, \d{1,2}:\d{2} - )/g, "\n$1");

    allMessages = parseChat(combinedData);
    resetChat();
  }

  function getActiveMessages() {
    return filteredMessages.length || searchInput.value.trim() ? filteredMessages : allMessages;
  }

  function resetChat() {
    chatContainer.innerHTML = "";

    const activeMessages = getActiveMessages();
    currentIndex = activeMessages.length;

    loadInitialMessages();
    toggleScrollButton();
    refreshSearchMatches();
  }

  function loadInitialMessages() {
    const activeMessages = getActiveMessages();
    const start = Math.max(0, currentIndex - CHUNK_SIZE);
    const slice = activeMessages.slice(start, currentIndex);

    renderMessages(slice, false);

    currentIndex = start;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    updateFloatingDate(true);
  }

  function loadOlderMessages() {
    if (currentIndex <= 0 || filteredMessages.length) return;

    const prevHeight = chatContainer.scrollHeight;
    const activeMessages = getActiveMessages();
    const start = Math.max(0, currentIndex - CHUNK_SIZE);
    const slice = activeMessages.slice(start, currentIndex);

    renderMessages(slice, true);

    currentIndex = start;
    chatContainer.scrollTop = chatContainer.scrollHeight - prevHeight;
    refreshSearchMatches();
  }

  function renderMessages(messages, prepend = false) {
    let lastRenderedDate = null;

    const items = prepend ? [...messages].reverse() : messages;

    items.forEach(msg => {
      if (msg.date !== lastRenderedDate) {
        const dateDiv = document.createElement("div");
        dateDiv.className = "date-separator";
        dateDiv.innerText = msg.date;

        if (prepend) chatContainer.prepend(dateDiv);
        else chatContainer.appendChild(dateDiv);

        lastRenderedDate = msg.date;
      }

      createMessage(msg.sender, msg.message, msg.time, prepend, msg.date);
    });
  }

  function createMessage(sender, rawMessage, time, prepend, date) {
    const msgDiv = document.createElement("div");
    const isViewer = sender === VIEWER;

    msgDiv.className = `message ${isViewer ? "me" : "other"}`;
    msgDiv.dataset.searchText = `${sender} ${rawMessage} ${time} ${date}`.toLowerCase();

    const message = normalizeAttachmentName(rawMessage);
    const fileType = getFileType(rawMessage);
    const filePath = `media/${message}`;

    if (fileType === "image") {
      const img = document.createElement("img");
      img.src = filePath;
      img.alt = message;

      img.onclick = () => {
        const overlay = document.createElement("div");
        overlay.className = "overlay";

        const fullImg = document.createElement("img");
        fullImg.src = filePath;
        fullImg.alt = message;

        overlay.appendChild(fullImg);
        overlay.onclick = () => overlay.remove();
        document.body.appendChild(overlay);
      };

      msgDiv.appendChild(img);
    } else if (fileType === "video") {
      const video = document.createElement("video");
      video.src = filePath;
      video.controls = true;
      msgDiv.appendChild(video);
    } else if (fileType === "doc") {
      const link = document.createElement("a");
      link.href = filePath;
      link.innerText = `📄 ${message}`;
      link.target = "_blank";
      msgDiv.appendChild(link);
    } else {
      msgDiv.textContent = rawMessage;
    }

    const timeDiv = document.createElement("div");
    timeDiv.className = "time";
    timeDiv.innerText = time;
    msgDiv.appendChild(timeDiv);

    if (prepend) chatContainer.prepend(msgDiv);
    else chatContainer.appendChild(msgDiv);
  }

  function toggleScrollButton() {
    if (!scrollBtn) return;

    const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
    scrollBtn.style.display = distanceFromBottom > 300 ? "block" : "none";
  }

  function getTopVisibleDateSeparator() {
    const separators = [...chatContainer.querySelectorAll(".date-separator")];
    if (!separators.length) return null;

    const scrollTop = chatContainer.scrollTop;
    let visible = separators[0];

    for (const separator of separators) {
      if (separator.offsetTop - 4 <= scrollTop) {
        visible = separator;
      } else {
        break;
      }
    }

    return visible;
  }

  function updateFloatingDate(force = false) {
    if (!floatingDate) return;

    const visibleDate = getTopVisibleDateSeparator();
    if (!visibleDate) return;

    floatingDate.innerText = visibleDate.innerText;
    floatingDate.style.display = "block";

    clearTimeout(dateHideTimer);

    if (!force) {
      dateHideTimer = setTimeout(() => {
        floatingDate.style.display = "none";
      }, 900);
    }
  }

  function refreshSearchMatches() {
    const query = searchInput.value.toLowerCase().trim();

    searchMatches = [...chatContainer.querySelectorAll(".message")].filter(messageDiv =>
      query && messageDiv.dataset.searchText.includes(query)
    );

    activeSearchMatchIndex = searchMatches.length ? 0 : -1;
    highlightSearchMatch();
  }

  function highlightSearchMatch() {
    document.querySelectorAll(".message.search-hit").forEach(el => el.classList.remove("search-hit"));

    if (activeSearchMatchIndex < 0 || !searchMatches[activeSearchMatchIndex]) return;

    const hit = searchMatches[activeSearchMatchIndex];
    hit.classList.add("search-hit");
    hit.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function goToSearchResult(direction) {
    if (!searchMatches.length) return;

    activeSearchMatchIndex = (activeSearchMatchIndex + direction + searchMatches.length) % searchMatches.length;
    highlightSearchMatch();
  }

  function applySearchFilter() {
    const value = searchInput.value.toLowerCase().trim();

    if (!value) {
      filteredMessages = [];
      resetChat();
      return;
    }

    filteredMessages = allMessages.filter(msg =>
      `${msg.sender} ${msg.message} ${msg.date} ${msg.time}`.toLowerCase().includes(value)
    );

    resetChat();
  }

  function openSearch() {
    searchBox.classList.remove("hidden");
    headerMenu.classList.add("hidden");
    searchInput.focus();
  }

  function closeSearch() {
    searchBox.classList.add("hidden");
    searchInput.value = "";
    filteredMessages = [];
    resetChat();
  }

  if (viewerSelect) {
    viewerSelect.addEventListener("change", () => {
      VIEWER = viewerSelect.value;
      updateHeader();
      updateWallpaper();
      resetChat();
    });
  }

  if (menuBtn && headerMenu) {
    menuBtn.addEventListener("click", e => {
      e.stopPropagation();
      headerMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", e => {
      if (!headerMenu.contains(e.target) && e.target !== menuBtn) {
        headerMenu.classList.add("hidden");
      }
    });
  }

  if (menuSearchBtn) {
    menuSearchBtn.addEventListener("click", openSearch);
  }

  searchCloseBtn?.addEventListener("click", closeSearch);
  searchUpBtn?.addEventListener("click", () => goToSearchResult(-1));
  searchDownBtn?.addEventListener("click", () => goToSearchResult(1));

  chatContainer.addEventListener("scroll", () => {
    if (chatContainer.scrollTop <= 10) loadOlderMessages();
    toggleScrollButton();
    updateFloatingDate();
  });

  if (scrollBtn) {
    scrollBtn.onclick = () => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
      toggleScrollButton();
      updateFloatingDate(true);
    };
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      applySearchFilter();
    });
  }

  updateHeader();
  updateWallpaper();
  loadAllChats();
});
