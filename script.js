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
  const menuMediaBtn = document.getElementById("menu-media");
  const menuSwitchBtn = document.getElementById("menu-switch");
  const mediaPanel = document.getElementById("media-panel");
  const mediaCloseBtn = document.getElementById("media-close");
  const mediaList = document.getElementById("media-list");
  const mediaTabs = [...document.querySelectorAll(".media-tab")];
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
  const stickerPanel = document.getElementById("sticker-panel");
  const stickerCloseBtn = document.getElementById("sticker-close");
  const stickerList = document.getElementById("sticker-list");
  const attachBtn = document.getElementById("attach-btn");
  const attachMenu = document.getElementById("attach-menu");
  const attachStickerBtn = document.getElementById("attach-sticker");
  const attachFileBtn = document.getElementById("attach-file");
  const stickerFileInput = document.getElementById("sticker-file-input");
=======
>>>>>>> main

  const input = document.getElementById("msg-input");
  const sendBtn = document.getElementById("send-btn");

  let VIEWER = viewerSelect ? viewerSelect.value : "Mehul";

  const CHUNK_SIZE = 200;
  const SEARCH_DEBOUNCE_MS = 120;
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
  const SEARCH_RESULT_LIMIT = 1500;
=======
>>>>>>> main
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
  let activeMediaType = "image";
  let searchDebounceTimer = null;

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
    let cleaned = String(rawMessage ?? "").trim();
    cleaned = cleaned.replace(/\s*\(file attached\)\s*$/i, "");
    cleaned = cleaned.replace(/^<attached:\s*/i, "").replace(/>$/, "");
    return cleaned.trim();
  }

  function getFileType(message) {
    const normalized = normalizeAttachmentName(message);
    if (/^STK.*\.webp$/i.test(normalized)) return "sticker";

    const cleanMessage = normalized.toLowerCase();
    if (imageExt.some(ext => cleanMessage.endsWith(ext))) return "image";
    if (videoExt.some(ext => cleanMessage.endsWith(ext))) return "video";
    if (docExt.some(ext => cleanMessage.endsWith(ext))) return "doc";
    return "text";
  }

  function toTimestamp(message) {
    if (Number.isFinite(Number(message.timestamp))) {
      return Number(message.timestamp);
    }

    const inferred = parseWhatsAppTimestamp(message.date, message.time || "");
    return Number.isFinite(inferred) ? inferred : 0;
  }

  function compareMessagesByTime(a, b) {
    return toTimestamp(a) - toTimestamp(b);
  }

  function parseWhatsAppTimestamp(rawDate, rawTime = "") {
    const dateMatch = String(rawDate || "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (!dateMatch) return NaN;

    let [, dayStr, monthStr, yearStr] = dateMatch;
    let year = Number(yearStr);
    if (yearStr.length === 2) year += year >= 70 ? 1900 : 2000;

    const day = Number(dayStr);
    const monthIndex = Number(monthStr) - 1;

    const timeText = String(rawTime || "").trim().toLowerCase();
    const timeMatch = timeText.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm))?$/);

    let hours = 0;
    let minutes = 0;
    if (timeMatch) {
      hours = Number(timeMatch[1]);
      minutes = Number(timeMatch[2]);
      const meridiem = timeMatch[3];
      if (meridiem === "pm" && hours < 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;
    }

    return new Date(year, monthIndex, day, hours, minutes, 0, 0).getTime();
  }

  function parseChat(data) {
    const lines = data.split("\n");
    const regex = /^(.+?), (.+?) - (.*?): (.*)$/;

    return lines
      .map(line => {
        const match = line.match(regex);
        if (!match) return null;
        const timestamp = parseWhatsAppTimestamp(match[1], match[2]);
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
    if (mediaPanel && !mediaPanel.classList.contains("hidden")) renderMediaList();
  }

  function getSearchFilteredMessages(query) {
    const queryLower = query.toLowerCase();
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
    const matches = [];

    for (const msg of allMessages) {
      if (`${msg.sender} ${msg.message} ${msg.time} ${msg.date}`.toLowerCase().includes(queryLower)) {
        matches.push(msg);
        if (matches.length >= SEARCH_RESULT_LIMIT) break;
      }
    }

    return matches;
=======
    return allMessages.filter(msg =>
      `${msg.sender} ${msg.message} ${msg.time} ${msg.date}`.toLowerCase().includes(queryLower)
    );
>>>>>>> main
  }

  function getMediaMessages(type) {
    return allMessages
      .filter(msg => getFileType(msg.message) === type)
      .sort((a, b) => toTimestamp(b) - toTimestamp(a));
  }

  function setActiveMediaTab(type) {
    activeMediaType = type;
    mediaTabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.type === type);
    });
  }

  function openMediaPanel() {
    headerMenu?.classList.add("hidden");
    mediaPanel?.classList.remove("hidden");
    setActiveMediaTab(activeMediaType);
    renderMediaList();
  }

  function closeMediaPanel() {
    mediaPanel?.classList.add("hidden");
  }

  function renderMediaList() {
    if (!mediaList) return;

    const mediaMessages = getMediaMessages(activeMediaType);
    mediaList.innerHTML = "";

    if (!mediaMessages.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "media-empty";
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
      const label = activeMediaType === "image" ? "photos" : activeMediaType === "video" ? "videos" : "stickers";
      emptyState.textContent = `No ${label} in chat yet.`;
=======
      emptyState.textContent = `No ${activeMediaType === "image" ? "photos" : "videos"} in chat yet.`;
>>>>>>> main
      mediaList.appendChild(emptyState);
      return;
    }

    mediaMessages.forEach(msg => {
      const filename = normalizeAttachmentName(msg.message);
      const path = `media/${filename}`;

      const card = document.createElement("button");
      card.type = "button";
      card.className = "media-item";

      const previewWrap = document.createElement("div");
      previewWrap.className = "media-preview";

<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
      if (activeMediaType === "image" || activeMediaType === "sticker") {
=======
      if (activeMediaType === "image") {
>>>>>>> main
        const img = document.createElement("img");
        img.src = path;
        img.alt = filename;
        previewWrap.appendChild(img);
      } else {
        const video = document.createElement("video");
        video.src = path;
        video.muted = true;
        video.playsInline = true;
        previewWrap.appendChild(video);
      }

      const meta = document.createElement("div");
      meta.className = "media-meta";
      meta.innerHTML = `<strong>${msg.date}</strong><span>${msg.time}</span>`;

      card.appendChild(previewWrap);
      card.appendChild(meta);
      card.addEventListener("click", () => {
        closeMediaPanel();
        const target = [...chatContainer.querySelectorAll(".message")].find(el =>
          el.dataset.searchText?.includes(`${msg.sender} ${msg.message} ${msg.time} ${msg.date}`.toLowerCase())
        );
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      mediaList.appendChild(card);
    });
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
  }

  function getStickerNames() {
    const stickers = new Set();
    allMessages.forEach(msg => {
      const name = normalizeAttachmentName(msg.message);
      if (/^STK.*\.webp$/i.test(name)) stickers.add(name);
    });
    return [...stickers].sort((a, b) => b.localeCompare(a));
  }

  function openStickerPanel() {
    attachMenu?.classList.add("hidden");
    renderStickerPicker();
    stickerPanel?.classList.remove("hidden");
  }

  function closeStickerPanel() {
    stickerPanel?.classList.add("hidden");
  }

  function renderStickerPicker() {
    if (!stickerList) return;
    stickerList.innerHTML = "";

    const stickers = getStickerNames();
    if (!stickers.length) {
      const emptyState = document.createElement("p");
      emptyState.className = "media-empty";
      emptyState.textContent = "No STK*.webp stickers found in chat.";
      stickerList.appendChild(emptyState);
      return;
    }

    stickers.forEach(name => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "media-item";
      button.innerHTML = `<div class="media-preview"><img src="media/${name}" alt="${name}"></div><div class="media-meta"><strong>${name}</strong></div>`;
      button.addEventListener("click", async () => {
        closeStickerPanel();
        await submitOutgoingMessage(`${name} (file attached)`);
      });
      stickerList.appendChild(button);
    });
  }

  async function submitOutgoingMessage(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;

    if (input) input.value = "";
    if (sendBtn) sendBtn.disabled = true;

    try {
      await sendMessage(trimmed);
    } catch (error) {
      if (input) input.value = trimmed;
      console.error(error);
      alert("Could not send message to Firebase. Please check your Firebase rules/connection.");
    } finally {
      if (sendBtn) sendBtn.disabled = false;
    }
=======
>>>>>>> main
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
    const runSearch = () => {
      if (!value) {
        isSearchMode = false;
        resetChat();
        return;
      }

      const matches = getSearchFilteredMessages(value);
      isSearchMode = true;
      chatContainer.innerHTML = "";
      renderMessages(matches, false);
      currentIndex = 0;
      toggleScrollButton();
      applySearchHighlight();
      updateFloatingDate(true);
    };

    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(runSearch, SEARCH_DEBOUNCE_MS);
  }

  function openSearch() {
    searchBox.classList.remove("hidden");
    headerMenu.classList.add("hidden");
    searchInput.focus();
    if (searchInput.value.trim()) applySearchFilter();
  }

  function closeSearch() {
    clearTimeout(searchDebounceTimer);
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
  menuMediaBtn?.addEventListener("click", openMediaPanel);
  menuSwitchBtn?.addEventListener("click", openViewerPicker);
  mediaCloseBtn?.addEventListener("click", closeMediaPanel);
  mediaPanel?.addEventListener("click", event => {
    if (event.target === mediaPanel) closeMediaPanel();
  });
  mediaTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      setActiveMediaTab(tab.dataset.type);
      renderMediaList();
    });
  });
<<<<<<< codex/add-media-selection-option-in-menu-c1yqko
  stickerCloseBtn?.addEventListener("click", closeStickerPanel);
  stickerPanel?.addEventListener("click", event => {
    if (event.target === stickerPanel) closeStickerPanel();
  });

  attachBtn?.addEventListener("click", event => {
    event.stopPropagation();
    attachMenu?.classList.toggle("hidden");
  });
  document.addEventListener("click", event => {
    if (!attachMenu?.contains(event.target) && event.target !== attachBtn) {
      attachMenu?.classList.add("hidden");
    }
  });

  attachStickerBtn?.addEventListener("click", openStickerPanel);
  attachFileBtn?.addEventListener("click", () => {
    attachMenu?.classList.add("hidden");
    stickerFileInput?.click();
  });
  stickerFileInput?.addEventListener("change", async () => {
    const file = stickerFileInput.files?.[0];
    stickerFileInput.value = "";
    if (!file) return;

    if (!/^STK.*\.webp$/i.test(file.name)) {
      alert("Only sticker files named STK*.webp are allowed.");
      return;
    }

    await submitOutgoingMessage(`${file.name} (file attached)`);
  });
=======
>>>>>>> main

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
    await submitOutgoingMessage(input?.value);
  });

  input?.addEventListener("keydown", async event => {
    if (event.key !== "Enter") return;
    event.preventDefault();

    await submitOutgoingMessage(input.value);
  });

  updateHeader();
  updateWallpaper();
  openViewerPicker();
  loadAllChats();
  wireFirebase();
});
