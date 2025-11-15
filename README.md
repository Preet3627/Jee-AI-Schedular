# JEE Scheduler Pro - Client-Side PWA

This is a secure, multilingual (EN/GU), **fully client-side** Student Management System (SMS) PWA tailored for JEE preparation. It replaces the need for manual scheduling by leveraging a universal CSV (Comma-Separated Values) format for personalized academic planning. All data is stored securely in your browser's `localStorage`.

## Features

- **Futuristic UI:** Clean, futuristic, card-based interface with glassmorphism effects and vibrant gradients.
- **Role-Based Dashboards:** Separate, secure dashboards for Students and Admins (Teachers), running entirely on local data.
- **Full Offline Functionality:** As a client-side PWA, the app works entirely offline. It uses a network-first caching strategy, ensuring you always have the latest data when online, while seamlessly switching to cached data when the network is unavailable.
- **Forced Offline Mode:** A setting allows users to force the app to use only local data, perfect for saving mobile data or working on unstable connections.
- **Full Screen Mode:** An immersive, distraction-free full screen mode can be toggled from the settings menu.
- **Community Hub with Images:** A collaborative space where students can post questions and solutions, now with **image upload support** for complex problems.
- **Universal CSV Imports:** A robust CSV guide and discoverability features (`robots.txt`) allow AI chatbots (like Gemini) to learn the syntax and assist teachers and students with bulk schedule, exam, and performance metric creation.
- **PWA Functionality:** Fully installable Progressive Web App with offline support via a service worker and automated, time-based reminders using the Web Notifications API.
- **Add to Calendar:** A universal feature to download schedule items as `.ics` files, compatible with Google, Apple, and other calendar apps.
- **Multilingual Support:** Full support for English (EN) and Gujarati (GU).

## A Note on PWA Widgets
This application declares a "widget" in its `manifest.json` file. This is part of an emerging web standard that allows PWAs to display information on host operating system surfaces, like a home screen. 

**This is different from a native Android Home Screen Widget.** Creating native widgets requires separate Android-specific code. The PWA widget feature is currently supported by a limited number of browsers and operating systems. By including the declaration, this app is future-ready for when the feature becomes more widely adopted.

## Tech Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS
- **Storage:** Browser `localStorage`

## Project Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd jee-scheduler-pro-fullstack
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Run in Development Mode:**
    This command starts the Vite development server. It will automatically open in your browser at `http://localhost:5173` (or another port).
    ```bash
    npm run dev
    ```

4.  **Build for Production:**
    This command will build the optimized frontend application into the `/dist` folder.
    ```bash
    npm run build
    ```

5.  **Preview Production Build:**
    After building, you can preview the production version locally.
    ```bash
    npm run preview
    ```