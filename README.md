# Store Management System (SMS)
### CIT310 Information Technology Project

---

## 📱 App Overview

The **Store Management System (SMS)** is a low-cost, lightweight Progressive Web App (PWA) designed for small and medium retail businesses. It allows store owners and staff to manage inventory, track transactions, compile invoices, and view daily sales summaries without requiring expensive point-of-sale (POS) hardware.

This project was built as a university team assignment for **CIT310 Information Technology Project** to demonstrate skills in full-stack web architectures, offline capabilities, secure client-side storage, and user-centric UI/UX design.


---

## ✨ Features

*   **📦 Inventory & Category Management:** Create, read, update, and categorize products. Supports searching by name or SKU, category-based filtering, and manual stock adjustment (IN/OUT).
*   **🧾 Invoice Builder & Direct PDF Printing:** Compile multi-line invoices with automatic totals calculations. Progress invoices through `Draft`, `Sent`, and `Paid` states. Supports direct browser-side printing using a hidden iframe.
*   **💰 Expense Tracking & Summaries:** Log rent, utilities, supplies, marketing, travel, and miscellaneous expenses. Keep a clean general ledger of all paid invoices and logged expenses.
*   **📊 Analytics Dashboard:** Review high-level inventory KPIs (total stock, low stock alert threshold `< 10` units) and analyze financial trends (revenue vs. expenses) via dynamic SVG double-bar charts.
*   **🔒 Zero-Trust Authentication:** Supports standard password logins and persistent device-bound cryptographic passkeys using the Web Crypto API. Restricts access to high-security administrative controls (database backup, restore, and user password resets) strictly to passkey-authenticated sessions.
*   **📶 PWA & Offline Support:** Installable as a standalone app on desktop and mobile. Automatically caches static assets using a service worker generated via Workbox, allowing complete database reads and writes offline.

---

## 🛠️ Tech Stack

*   **Framework & Language:** React 18, JavaScript (ES6+), HTML5, CSS3
*   **Bundler & Dev Server:** Vite
*   **Client Database:** Web IndexedDB API
*   **Cryptography:** Web Crypto API (P-256 ECDSA device key pairs, SHA-256 password salting/hashing)
*   **Libraries:** `jspdf` (v4.2.1), `jspdf-autotable` (v5.0.7)
*   **PWA Integrations:** `vite-plugin-pwa` (v0.16.5)

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:
*   **Node.js** (v16.0.0 or higher recommended)
*   **npm** (v8.0.0 or higher)
*   A modern web browser supporting IndexedDB and Web Crypto (e.g., Chrome, Edge, Firefox, or Safari)

---

## 🚀 Quick Start Guide

1.  **Clone the Repository:**
    ```bash
    git clone <repo-url>
    cd SMS-Project
    ```

2.  **Install Project Dependencies:**
    ```bash
    npm install
    ```

3.  **Launch the Development Server:**
    ```bash
    npm run dev
    ```

4.  **Access the Application:**
    *   Open your browser and navigate to the local URL (usually `http://localhost:5173`).

### ⚙️ Environment Variables
This project runs entirely on the client side using local browser storage (IndexedDB) and **does not require any external environment variables**. A `.env` file is not needed.

---

## 👥 Team Contributions

*   **S.A.D. Sithmini (Team Leader / Full Stack):**
    *   Designed application architecture and routed pages.
    *   Integrated frontend components with mock API structures.
    *   Managed codebase repository and feature branches.
*   **W.J.P.S.H. Jayasuriya (UI/UX / Frontend):**
    *   Created visual UI layout design and theme parameters using Vanilla CSS.
    *   Crafted responsive sidebar layout structures and mobile view toggles.
    *   Implemented dashboard visual components, including SVG dynamic bar charts.
*   **S.L.B.C. Jayarathna (Data Layer / PDF Integration):**
    *   Configured database client adapters and wrappers using IndexedDB API.
    *   Integrated dynamic document generators using `jsPDF` and `jspdf-autotable`.
    *   Developed the direct document print layout mechanics.
*   **N.M.R.G.H. Karunarathna (Testing / PWA / Documentation):**
    *   Configured Progressive Web App manifest, service worker registrations, and offline caching.
    *   Wrote project user manuals, reports, and code documentation.
    *   Verified user permission validation workflows.
