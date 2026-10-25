# ChatSphere — chat by username

A responsive starter web app with Google sign-in, unique usernames, username search, and real-time one-to-one messaging using Firebase Authentication + Cloud Firestore.

## Before you start

You'll need a Google account and a Firebase project. This starter is a working app scaffold, but it will not connect until you add your own Firebase configuration and publish the rules.

## 1. Create a Firebase project

1. Open https://console.firebase.google.com/ and create a project.
2. In **Build → Authentication → Sign-in method**, enable **Google**.
3. In **Build → Firestore Database**, create a database (choose production mode).
4. Open **Project settings → General → Your apps** and register a **Web app**.
5. Copy the Firebase web config and paste its values into `firebaseConfig` at the top of `app.js`.
6. In Authentication → Settings → Authorized domains, add the domain you'll use (for local testing, add `localhost` if it isn't listed).

## 2. Publish Firestore rules

In Firebase Console → Firestore Database → Rules, replace the rules with the contents of `firestore.rules`, then click **Publish**.

These rules are a starter baseline, not a full production security review. A production launch should add rate limiting/abuse prevention, reporting and blocking, stricter profile-field validation, and testing of every security rule. User profiles are searchable by signed-in users; do not put private information in them.

## 3. Run locally

Because this uses JavaScript modules, open it through a local web server (not by double-clicking `index.html`).

If Python is installed, open a terminal in this folder and run:

```bash
python -m http.server 8000
```

Then visit http://localhost:8000.

Alternatively, use VS Code's Live Server extension. Sign in with Google, pick a username, then open Discover and search for another account's username.

## 4. Deploy free-tier hosting with Firebase Hosting

Install Node.js, then in a terminal:

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
```

Choose the Firebase project you created, set the public directory to the current folder (`.`), configure as a single-page app **No**, and do not overwrite `index.html`. Then deploy:

```bash
firebase deploy --only hosting
```

Firebase free-tier quotas and terms can change. Check the Firebase pricing page for current limits before launching publicly.

## Important notes / known starter limitations

- Username matching is case-insensitive because usernames are stored lowercase.
- Usernames are intended to be unique. For a public production app, reserve usernames atomically with a trusted backend/Cloud Function to prevent race conditions.
- This is real-time text chat, not end-to-end encrypted messaging. “Private conversation” means access is restricted by Firestore rules; it is not a claim of end-to-end encryption.
- No image/file sending, voice/video calls, push notifications, blocking/reporting, message deletion, or account recovery UI yet.
- The initial chat-list query is limited to 50 conversations and messages to 300 per conversation.
- Keep Firebase config's API key in its normal web-app form; access control must come from Firebase Authentication and Security Rules, never from hiding the web config.
