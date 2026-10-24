# Gather — Modern Social Media Platform

<div align="center">

[![Angular](https://img.shields.io/badge/Angular-v21-dd0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![State Management](https://img.shields.io/badge/State-Angular_Signals-059669?style=for-the-badge)](https://angular.dev/guide/signals)

**A high-performance, mobile-first social media web application built with Angular 21, TypeScript, and Tailwind CSS.**

[Features](#-features) • [Recruiter Highlights](#-why-this-project-stands-out) • [Tech Stack](#-tech-stack) • [Project Structure](#-project-structure) • [Getting Started](#-getting-started)

</div>

---

## 📌 Project Overview

**Gather** is a full-featured social platform crafted with an editorial, publication-inspired aesthetic. Built to showcase modern frontend engineering practices, the application features seamless content discovery, interactive post feeds, real-time reactive updates, media uploads, and a responsive experience across desktop, tablet, and mobile devices.

---

## 🌟 Why This Project Stands Out (For Recruiters & Tech Leads)

This project was built from scratch to demonstrate **production-grade enterprise Angular skills**:

- **⚡ Native Angular Signals Reactivity**: Uses `signal()` and `computed()` for surgical change detection and performant state management without the boilerplate of heavy external stores.
- **🧱 Modern Standalone Architecture**: 100% standalone components with zero `NgModule` bloat, enabling efficient lazy loading and lightweight bundle sizes.
- **🔄 Full CRUD & Optimistic UI**: Create, read, edit, and delete posts with custom confirmation dialogs, inline comment threads, and instant optimistic feedback for likes and bookmarks.
- **📷 Multipart File Uploads**: Real-time image uploading for both post media attachments and profile portraits with live image preview modals and immediate app-wide avatar sync.
- **🛡️ Secure Auth & Interceptors**: Complete JWT authentication flow with automatic bearer token attachment via HTTP Interceptors and route-level navigation guards.
- **📱 Mobile-First Responsive Design**: Dynamic layout switching between a 3-column desktop view and a native-feeling mobile experience complete with sticky bottom navigation and composer sheets.
- **✨ Clean Separation of Concerns**: Strict design principle where 100% of HTML templates and Tailwind utility styles remain in their dedicated `.html` and `.css` files, keeping `.ts` logic classes clean and testable.

---

## 🚀 Key Features

### 📰 Feed & Posts
- **Dynamic Streams**: Toggle between community-wide posts and accounts you follow.
- **Infinite Scrolling**: Smooth, performant feed pagination powered by `IntersectionObserver`.
- **Rich Post Creation**: Write long-form copy with character counters and image attachment previews.
- **Post Management (Edit/Delete)**: Edit post text and attachments on the fly, or delete posts safely with custom confirmation dialogs.
- **Inline Comments & Reactions**: Like posts and expand discussion threads directly in the feed or on dedicated post detail views.

### 👤 Profile & User Management
- **Interactive Profiles**: View user bio, stats, follower counts, and their published posts.
- **Profile Photo Upload**: Change profile pictures directly using an interactive upload modal with crop preview and live synchronization across the navbar and comments.
- **Follow / Unfollow**: Instant social graph updates with reactive follower counts.

### 🔔 Notifications & Bookmarks
- **Activity Feed**: Receive notifications for likes, comments, and new followers.
- **Unread Badge Counters**: Real-time unread badge indicators in the global header and bottom nav.
- **Saved Archives**: Bookmark favorite posts for later reading.

---

## 🛠️ Tech Stack

| Technology | Role | Highlights |
| :--- | :--- | :--- |
| **Angular 21** | Frontend Framework | Standalone components, Signals, modern control flow (`@if`, `@for`) |
| **TypeScript** | Programming Language | Strict typing, robust interfaces, and clean code architecture |
| **Tailwind CSS v4** | UI Styling | Custom typography, sleek dark/light tones, responsive design tokens |
| **RxJS & HttpClient** | Async & Data Fetching | RESTful API integration, reactive streams, and multipart form requests |
| **Vitest** | Testing Suite | Fast unit and component testing |

---

## 📂 Project Structure

```text
src/app/
├── core/                  # Core singletons & global infrastructure
│   ├── auth/              # JWT interceptors, token storage & route guards
│   ├── models/            # TypeScript interfaces (Post, User, Comment, API)
│   └── services/          # Business logic & HTTP services (Posts, Users, Notifications)
├── features/              # Feature modules (Domain-driven design)
│   ├── home-feed/         # Feed stream, post composers & inline threads
│   ├── post-detail/       # Detailed post view with expanded discussions
│   ├── author-profile/    # Profile folio, user posts & photo uploader
│   ├── notifications/     # Notification activity ledger
│   ├── archives/          # Saved bookmarked posts
│   ├── navbar/            # Global persistent navigation bar & search
│   ├── sign-in/           # User authentication login
│   └── sign-up/           # New account registration
├── layout/                # Shell layouts
│   ├── main/              # Master layout (Navbar + Content + Mobile Bottom Nav)
│   └── auth/              # Split-screen authentication layout
└── shared/                # Reusable UI components
    └── ui/                # ConfirmModal, EditPostModal, UpdatePhotoModal, Toasts
```

---

## 💻 Getting Started

### Prerequisites
- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **Angular CLI**: `npm install -g @angular/cli`

### Installation & Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/social-media-app.git
   cd social-media-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm start
   ```

4. **View in browser:**
   Open [http://localhost:4200/](http://localhost:4200/) in your browser.

### Build for Production

```bash
npm run build
```
Optimized assets will be generated in the `dist/` directory.

---

## 👤 Author

**Karam Ahmed**  
- **GitHub**: [@Dakhlala](https://github.com/Dakhlala)  
- **LinkedIn**: [Karam Ahmed](https://www.linkedin.com/in/dakhlala/)  
- **Email**: [karamhagag5@gmail.com](mailto:karamhagag5@gmail.com)
