document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  const chatContainer = document.getElementById("chat-container");
  const viewerSelect = document.getElementById("viewer");
  const viewerPicker = document.getElementById("viewer-picker");
  const viewerOptionButtons = [...document.querySelectorAll(".viewer-option")];

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
  const menuSwitchBtn = document.getElementById("menu-switch");

  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("send-btn");

  let VIEWER = viewerSelect ? viewerSelect.value : "Mehul";

  const CHUNK_SIZE = 200;
  const imageExt = [".jpg", ".jpeg", ".png", ".webp"];
  const videoExt = [".mp4", ".webm", ".ogg", ".opus"];
  const docExt = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx", ".zip"];
  const files = ["chat1.txt", "chat2.txt", "chat3.txt", "chat4.txt", "chat5.txt"];
  const LOCAL_STORAGE_KEY = "chat_local_messages";

  const viewerWallpapers = {
    Mehul: "media/mehulchat.jpg",
    Dimp: "media/dimpchat.jpg"
  };

  let allMessages = [];
  let currentIndex = 0;
  let dateHideTimer = null;
  let searchMatches = [];
  let activeSearchMatchIndex = -1;
  let isSearchMode = false;
  let firebaseInitialLoadDone = false;
  const loadedFirebaseDocIds = new Set();

  function syncViewerSelect() {
    if (viewerSelect) viewerSelect.value = VIEWER;
  }

  function updateHeader() {
    if (!dp || !chatName) return;

    if (VIEWER === "Mehul") {
      chatName.innerText = "Dimple";
      dp.src = "media/dimp.jpg";
      dp.alt = "Dimple";
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
    app.style.backgroundPosition = "center center";
    app.style.backgroundRepeat = "no-repeat";
    app.style.backgroundSize = VIEWER === "Mehul" ? "contain" : "cover";
  }

  function openViewerPicker() {
    viewerPicker?.classList.remove("hidden");
    headerMenu?.classList.add("hidden");
  }

  function closeViewerPicker() {
    viewerPicker?.classList.add("hidden");
  }

  function setViewer(nextViewer) {
    VIEWER = nextViewer;
    syncViewerSelect();
    updateHeader();
    updateWallpaper();
    resetChat();
    closeViewerPicker();
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

  function toTimestamp(message) {
    if (Number.isFinite(Number(message.timestamp))) {
      return Number(message.timestamp);
    }

    const inferred = Date.parse(`${message.date} ${message.time || ""}`);
    return Number.isFinite(inferred) ? inferred : 0;
  }

  function compareMessagesByTime(a, b) {
    return toTimestamp(a) - toTimestamp(b);
  }

  function parseChat(data) {
    const lines = data.split("\n");
    const regex = /^(.+?), (.+?) - (.*?): (.*)$/;

    return lines
      .map(line => {
        const match = line.match(regex);
        if (!match) return null;
        const timestamp = Date.parse(`${match[1]} ${match[2]}`);
        return {
          date: match[1],
          time: match[2],
          sender: match[3],
          message: match[4].trim(),
          timestamp: Number.isFinite(timestamp) ? timestamp : undefined
        };
      })
      .filter(Boolean);
  }

  function loadLocalMessages() {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(item => item && typeof item.message === "string");
    } catch (error) {
      console.warn("Could not load local messages:", error);
      return [];
    }
  }

  function saveLocalMessages() {
    const localOnly = allMessages.filter(msg => msg.localOnly === true);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localOnly));
    } catch (error) {
      console.warn("Could not persist local messages:", error);
    }
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

    if (combinedData) {
      combinedData = combinedData.replace(/(\d{2}\/\d{2}\/\d{4}, \d{1,2}:\d{2} - )/g, "\n$1");
      allMessages = parseChat(combinedData);
    } else {
      allMessages = [];
    }

    allMessages.sort(compareMessagesByTime);
    resetChat();
  }

  function resetChat() {
    chatContainer.innerHTML = "";

    if (isSearchMode) {
      renderMessages(allMessages, false);
      currentIndex = 0;
    } else {
      currentIndex = allMessages.length;
      loadInitialMessages();
    }

    toggleScrollButton();
    applySearchHighlight();
  }

  function loadInitialMessages() {
    const start = Math.max(0, currentIndex - CHUNK_SIZE);
    const slice = allMessages.slice(start, currentIndex);
    renderMessages(slice, false);

    currentIndex = start;
    chatContainer.scrollTop = chatContainer.scrollHeight;
    updateFloatingDate(true);
  }

  function loadOlderMessages() {
    if (currentIndex <= 0 || isSearchMode) return;

    const prevHeight = chatContainer.scrollHeight;
    const start = Math.max(0, currentIndex - CHUNK_SIZE);
    const slice = allMessages.slice(start, currentIndex);

    renderMessages(slice, true);
    currentIndex = start;
    chatContainer.scrollTop = chatContainer.scrollHeight - prevHeight;
    applySearchHighlight();
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
      const textDiv = document.createElement("div");
      textDiv.className = "message-text";
      textDiv.dataset.raw = rawMessage;
      textDiv.textContent = rawMessage;
      msgDiv.appendChild(textDiv);
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
      if (separator.offsetTop - 4 <= scrollTop) visible = separator;
      else break;
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

  function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function applySearchHighlight() {
    const query = searchInput.value.trim();
    const queryLower = query.toLowerCase();
    const regex = query ? new RegExp(`(${escapeRegex(query)})`, "gi") : null;

    document.querySelectorAll(".message.search-hit").forEach(el => el.classList.remove("search-hit"));

    const textBlocks = [...chatContainer.querySelectorAll(".message-text")];
    textBlocks.forEach(block => {
      const raw = block.dataset.raw || block.textContent || "";
      if (!regex) {
        block.textContent = raw;
        return;
      }

      if (raw.toLowerCase().includes(queryLower)) {
        block.innerHTML = raw.replace(regex, '<mark class="search-mark">$1</mark>');
      } else {
        block.textContent = raw;
      }
    });

    searchMatches = [...chatContainer.querySelectorAll(".message")].filter(messageDiv =>
      query && messageDiv.dataset.searchText.includes(queryLower)
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

    const nextIndex = activeSearchMatchIndex + direction;
    if (nextIndex < 0 || nextIndex >= searchMatches.length) return;

    activeSearchMatchIndex = nextIndex;
    highlightSearchMatch();
  }

  function applySearchFilter() {
    const value = searchInput.value.trim();

    if (!value) {
      isSearchMode = false;
      resetChat();
      return;
    }

    if (!isSearchMode) {
      isSearchMode = true;
      resetChat();
      return;
    }

    applySearchHighlight();
  }

  function openSearch() {
    searchBox.classList.remove("hidden");
    headerMenu.classList.add("hidden");
    searchInput.focus();
    if (searchInput.value.trim()) {
      isSearchMode = true;
      resetChat();
    }
  }

  function closeSearch() {
    searchBox.classList.add("hidden");
    searchInput.value = "";
    isSearchMode = false;
    resetChat();
  }

  function getFirebaseTimestamp(rawTimestamp) {
    if (typeof rawTimestamp === "number") return rawTimestamp;
    if (rawTimestamp && typeof rawTimestamp.toMillis === "function") return rawTimestamp.toMillis();
    if (rawTimestamp && Number.isFinite(rawTimestamp.seconds)) return rawTimestamp.seconds * 1000;
    return Date.now();
  }

  function buildMessageFromFirebase(data, docId) {
    const stamp = getFirebaseTimestamp(data.timestamp);
    const when = new Date(stamp);

    return {
      id: docId,
      date: when.toLocaleDateString(),
      time: when.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: data.sender || "Unknown",
      message: data.message || "",
      timestamp: stamp
    };
  }

  function appendFirebaseMessage(data, docId) {
    if (docId && loadedFirebaseDocIds.has(docId)) return;

    const newMsg = buildMessageFromFirebase(data, docId);
    allMessages.push(newMsg);
    if (docId) loadedFirebaseDocIds.add(docId);

    const lastDate = chatContainer.querySelector(".date-separator:last-of-type")?.innerText;
    if (lastDate !== newMsg.date) {
      const dateDiv = document.createElement("div");
      dateDiv.className = "date-separator";
      dateDiv.innerText = newMsg.date;
      chatContainer.appendChild(dateDiv);
    }

    createMessage(newMsg.sender, newMsg.message, newMsg.time, false, newMsg.date);
    toggleScrollButton();
  }

  async function sendMessage(text) {
    const firestore = window.firebaseFirestore;
    const db = window.firebaseDb;

    if (!firestore || !db) {
      throw new Error("Firebase is not ready yet.");
    }

    await firestore.addDoc(firestore.collection(db, "messages"), {
      sender: VIEWER,
      message: text,
      timestamp: firestore.serverTimestamp()
    });
  }

  function wireFirebase() {
    const firestore = window.firebaseFirestore;
    const db = window.firebaseDb;

    if (!firestore || !db) {
      console.warn("Firebase unavailable; chat sync requires Firebase.");
      return;
    }

    const q = firestore.query(firestore.collection(db, "messages"), firestore.orderBy("timestamp"));

    firestore.onSnapshot(q, snapshot => {
      if (!firebaseInitialLoadDone) {
        snapshot.docs.forEach(doc => {
          if (loadedFirebaseDocIds.has(doc.id)) return;
          loadedFirebaseDocIds.add(doc.id);
          allMessages.push(buildMessageFromFirebase(doc.data(), doc.id));
        });

        allMessages.sort(compareMessagesByTime);
        resetChat();
        firebaseInitialLoadDone = true;
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return;
      }

      snapshot.docChanges().forEach(change => {
        if (change.type === "added") appendFirebaseMessage(change.doc.data(), change.doc.id);
      });

      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  }

  if (viewerSelect) {
    viewerSelect.addEventListener("change", () => setViewer(viewerSelect.value));
  }

  viewerOptionButtons.forEach(button => {
    button.addEventListener("click", () => setViewer(button.dataset.viewer));
  });

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

  menuSearchBtn?.addEventListener("click", openSearch);
  menuSwitchBtn?.addEventListener("click", openViewerPicker);

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

  searchInput?.addEventListener("input", applySearchFilter);

  sendBtn?.addEventListener("click", async () => {
    const text = input?.value.trim();
    if (!text) return;

    try {
      await sendMessage(text);
      input.value = "";
    } catch (error) {
      console.error(error);
      alert("Could not send message to Firebase. Please check your Firebase rules/connection.");
    }
  });

  input?.addEventListener("keydown", async event => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    try {
      await sendMessage(text);
      input.value = "";
    } catch (error) {
      console.error(error);
      alert("Could not send message to Firebase. Please check your Firebase rules/connection.");
    }
  });

  updateHeader();
  updateWallpaper();
  openViewerPicker();
  loadAllChats();
  wireFirebase();
});
