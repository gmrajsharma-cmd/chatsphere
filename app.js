import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, orderBy, limit, getDocs, onSnapshot, addDoc, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// 1) Paste your Firebase web app config here (Firebase Console > Project settings > Your apps).
const firebaseConfig = {
  apiKey: "AIzaSyBg0mPMpCh6Bfm-WXnWV4TFKMTb5vFisiQ",
  authDomain: "chatsphere-e7a6a.firebaseapp.com",
  projectId: "chatsphere-e7a6a",
  storageBucket: "chatsphere-e7a6a.firebasestorage.app",
  messagingSenderId: "869519112028",
  appId: "1:869519112028:web:90af0bddac48eb5c83b399",
  measurementId: "G-4V01057633"
};



// For Firebase JS SDK v7.20.0 and later, measurementId is optional


const $ = (id) => document.getElementById(id);
const loginScreen = $("loginScreen"), usernameScreen = $("usernameScreen"), chatApp = $("chatApp");
let auth, db, currentUser = null, profile = null, selectedUser = null;
let stopPeople = null, stopMessages = null, stopChats = null, discoverMode = false, toastTimer;

function showToast(message) {
  const el = $("toast"); el.textContent = message; el.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
function showScreen(which) {
  loginScreen.classList.toggle("hidden", which !== "login");
  usernameScreen.classList.toggle("hidden", which !== "username");
  chatApp.classList.toggle("hidden", which !== "chat");
}
function avatarUrl(user) {
  return user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || user?.username || "User")}&background=252f49&color=ddd8ff&bold=true`;
}
function safeText(value="") { return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function setAvatar(el, user) { el.src = avatarUrl(user); el.onerror = () => { el.src = avatarUrl({displayName:"User"}); }; }
function formatTime(ts) {
  if (!ts?.toDate) return "now";
  return ts.toDate().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
function chatId(a,b) { return [a,b].sort().join("_"); }

async function initFirebase() {
  if (firebaseConfig.apiKey.includes("PASTE_") || firebaseConfig.projectId.includes("PASTE_")) {
    $("loginError").textContent = "Setup needed: add your Firebase config in app.js. See README.md.";
    $("googleLogin").disabled = true;
    $("googleLogin").style.opacity = ".6";
    return;
  }
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app); db = getFirestore(app);
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (!user) {
      cleanupListeners(); profile = null; selectedUser = null; showScreen("login"); return;
    }
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists() && snap.data().username) {
        profile = {uid:user.uid, ...snap.data()};
        enterChat();
      } else {
        showScreen("username");
        $("usernameInput").value = "";
      }
    } catch (e) {
      console.error(e); showToast("Could not load your profile. Check Firestore rules.");
    }
  });
}

$("googleLogin").addEventListener("click", async () => {
  if (!auth) return;
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch(e) { $("loginError").textContent = e.code === "auth/popup-closed-by-user" ? "Sign-in cancelled." : `${e.code || "Sign-in error"}: ${e.message}`; }
});
$("saveUsername").addEventListener("click", async () => {
  const username = $("usernameInput").value.trim().toLowerCase();
  const error = $("usernameError"); error.textContent = "";
  if (!/^[a-z0-9_]{3,20}$/.test(username)) { error.textContent = "Use 3–20 lowercase letters, numbers or underscores."; return; }
  if (!currentUser) return;
  $("saveUsername").disabled = true;
  try {
    const usernameRef = doc(db, "usernames", username);
    const existing = await getDoc(usernameRef);
    if (existing.exists() && existing.data().uid !== currentUser.uid) { error.textContent = "That username is taken. Try another."; return; }
    const userProfile = {
      uid: currentUser.uid, username, usernameLower: username,
      displayName: currentUser.displayName || username,
      photoURL: currentUser.photoURL || "",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp()
    };
    // The usernames/{username} document reserves the unique username.
    await setDoc(usernameRef, {uid:currentUser.uid, username});
    await setDoc(doc(db, "users", currentUser.uid), userProfile);
    profile = userProfile; enterChat();
  } catch(e) {
    console.error(e); error.textContent = "Couldn't save username. Check Firestore rules and try again.";
  } finally { $("saveUsername").disabled = false; }
});
$("logoutBtn").addEventListener("click", async () => { if (auth) { cleanupListeners(); await signOut(auth); } });
$("chatsTab").addEventListener("click", () => { discoverMode=false; updateTabs(); $("searchInput").value=""; loadChatList(); });
$("discoverTab").addEventListener("click", () => { discoverMode=true; updateTabs(); $("searchInput").value=""; loadDiscover(""); });
$("discoverCta").addEventListener("click", () => $("discoverTab").click());
$("searchInput").addEventListener("input", (e) => {
  discoverMode = true; updateTabs(); loadDiscover(e.target.value.trim().replace(/^@/,"").toLowerCase());
});
function updateTabs() {
  $("chatsTab").classList.toggle("active", !discoverMode);
  $("discoverTab").classList.toggle("active", discoverMode);
  $("listCaption").textContent = discoverMode ? "FIND PEOPLE" : "YOUR CONVERSATIONS";
}
function cleanupListeners() {
  if (stopPeople) stopPeople(); if (stopMessages) stopMessages(); if (stopChats) stopChats();
  stopPeople = stopMessages = stopChats = null;
}
function enterChat() {
  showScreen("chat");
  $("myName").textContent = profile.displayName || currentUser.displayName || "User";
  $("myHandle").textContent = "@"+profile.username;
  setAvatar($("myPhoto"), profile);
  discoverMode = false; updateTabs(); loadChatList();
}
function renderPeople(users, mode) {
  const list = $("peopleList"); list.innerHTML = "";
  if (!users.length) {
    list.innerHTML = `<div class="no-results">${mode==="discover" ? "No users found. Try another username." : "No conversations yet.<br>Open Discover to find someone by username."}</div>`; return;
  }
  users.forEach(u => {
    const row = document.createElement("button");
    row.className = "person-row" + (selectedUser?.uid === u.uid ? " selected" : "");
    row.innerHTML = `<img class="avatar" alt=""><span class="person-meta"><strong>${safeText(u.displayName || u.username)}</strong><span>@${safeText(u.username || "")}</span></span><span class="person-action">${mode==="discover" ? "Message ↗" : "Open →"}</span>`;
    setAvatar(row.querySelector("img"), u);
    row.addEventListener("click", () => openConversation(u));
    list.appendChild(row);
  });
}
async function loadDiscover(term) {
  if (stopPeople) { stopPeople(); stopPeople = null; }
  if (!profile) return;
  try {
    let q;
    if (term) q = query(collection(db,"users"), where("usernameLower", ">=", term), where("usernameLower", "<=", term+"\uf8ff"), limit(25));
    else q = query(collection(db,"users"), limit(25));
    stopPeople = onSnapshot(q, snap => {
      const users = snap.docs.map(d => d.data()).filter(u => u.uid !== currentUser.uid).sort((a,b)=>(a.username||"").localeCompare(b.username||""));
      renderPeople(users,"discover");
    }, e => { console.error(e); $("peopleList").innerHTML='<div class="no-results">Could not search users. Check Firestore rules.</div>'; });
  } catch(e) { console.error(e); }
}
function loadChatList() {
  if (!profile) return;
  if (stopPeople) { stopPeople(); stopPeople = null; }
  // Chat membership is indexed by participant IDs. Each user can only read chats they belong to (rules).
  const q = query(collection(db,"chats"), where("members","array-contains",currentUser.uid), limit(50));
  stopPeople = onSnapshot(q, async snap => {
    const chats = snap.docs.map(d=>({id:d.id,...d.data()}));
    const peers = await Promise.all(chats.map(async c => {
      const peerId = c.members.find(id=>id!==currentUser.uid);
      if (!peerId) return null;
      const ps = await getDoc(doc(db,"users",peerId));
      return ps.exists() ? {...ps.data(), lastMessage:c.lastMessage||""} : null;
    }));
    renderPeople(peers.filter(Boolean),"chats");
  }, e => { console.error(e); $("peopleList").innerHTML='<div class="no-results">Could not load chats. Check Firestore rules.</div>'; });
}
async function openConversation(peer) {
  if (!peer?.uid || peer.uid === currentUser.uid) return;
  selectedUser = peer;
  $("chatApp").classList.add("chat-open");
  $("emptyState").classList.add("hidden"); $("activeChat").classList.remove("hidden");
  $("peerName").textContent = peer.displayName || peer.username;
  $("peerHandle").textContent = "@"+peer.username;
  setAvatar($("peerPhoto"),peer);
  if (stopMessages) stopMessages();
  renderPeopleFromCurrentMode();
  const id = chatId(currentUser.uid,peer.uid);
  const chatRef = doc(db,"chats",id);
  try {
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) await setDoc(chatRef,{members:[currentUser.uid,peer.uid].sort(),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),lastMessage:""});
    const q = query(collection(db,"chats",id,"messages"),orderBy("createdAt","asc"),limit(300));
    stopMessages = onSnapshot(q, snap => {
      const box = $("messages"); box.innerHTML = "";
      snap.docs.forEach(d => {
        const m=d.data(), mine=m.senderId===currentUser.uid;
        const item=document.createElement("div"); item.className="message "+(mine?"mine":"theirs");
        item.innerHTML=`<div class="message-bubble">${safeText(m.text||"")}</div><span class="message-time">${formatTime(m.createdAt)}</span>`;
        box.appendChild(item);
      });
      if (!snap.docs.length) box.innerHTML='<div class="date-divider">This is the beginning of your conversation ✦</div>';
      box.scrollTop=box.scrollHeight;
    },e=>{console.error(e);showToast("Could not load messages. Check Firestore rules.");});
  } catch(e) { console.error(e); showToast("Could not open chat. Check Firestore rules."); }
}
function renderPeopleFromCurrentMode() {
  // Current list remains driven by the active list listener.
}
async function sendMessage() {
  const text=$("messageInput").value.trim();
  if (!text || !selectedUser || !currentUser) return;
  const input=$("messageInput"); input.value=""; input.style.height="auto";
  const id=chatId(currentUser.uid,selectedUser.uid), chatRef=doc(db,"chats",id);
  $("sendBtn").disabled=true;
  try {
    await addDoc(collection(db,"chats",id,"messages"),{text,senderId:currentUser.uid,createdAt:serverTimestamp()});
    await updateDoc(chatRef,{lastMessage:text.slice(0,120),lastSenderId:currentUser.uid,updatedAt:serverTimestamp()});
  } catch(e) { console.error(e); input.value=text; showToast("Message failed to send. Check Firestore rules."); }
  finally { $("sendBtn").disabled=false; input.focus(); }
}
$("sendBtn").addEventListener("click",sendMessage);
$("messageInput").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}});
$("messageInput").addEventListener("input",e=>{e.target.style.height="auto";e.target.style.height=Math.min(e.target.scrollHeight,140)+"px";});
initFirebase();
