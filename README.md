<!-- PROJECT LOGO -->
<p align="center">
  <img src="public/logo.png" alt="VESPER Logo" width="240" />
</p>

<p align="center"><b>Virtual Entity Surveillance & Profiling Engine for Research</b></p>

<p align="center">
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.0-blue" />
  <img alt="Stack" src="https://img.shields.io/badge/Next.js-15.1-black" />
  <img alt="Engine" src="https://img.shields.io/badge/Puppeteer-Automated-green" />
  <img alt="Database" src="https://img.shields.io/badge/Prisma-PostgreSQL-blue" />
  <img alt="License" src="https://img.shields.io/badge/license-MIT-green" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation & Deployment](#-installation--deployment)
  - [Option A: Automated Installation (VPS / Zero-to-Hero)](#option-a-automated-installation-vps--zero-to-hero)
  - [Option B: Manual Installation (Development Environment)](#option-b-manual-installation-development-environment)
  - [Critical Step (Cookies)](#-critical-step-for-both-options)
- [Environment Variables](#-environment-variables)
- [Optional: Domain + SSL (Nginx + Let's Encrypt)](#-optional-domain--ssl-nginx--lets-encrypt)
- [User Guide](#-user-guide)
- [Security & Operational Notes](#-security--operational-notes)
- [Troubleshooting](#-troubleshooting)
- [Legal Notice (Disclaimer)](#-legal-notice-disclaimer)

---

## Overview

**VESPER** is an advanced **OSINT** (Open Source Intelligence) and **GEOINT** (Geospatial Intelligence) platform designed to automate the collection, analysis, and correlation of social media data (Instagram). The system combines active scraping techniques, passive network listening ("Ghost Data"), and identity breach correlation.

---

## Key Features

- **Aggressive "Ghost Data" Extraction**  
  Uses a custom `NetworkInterceptor` that hooks into the browser data stream to capture hidden JSON data (PK identifiers, business emails, precise GPS coordinates).

- **3D GEOINT Visualization**  
  Maps a target’s movement history on an interactive 3D map by correlating post metadata with physical coordinates.

- **Identity Vault & Verification**  
  A correlation module that lets you “promote” data from breach sources (Identity Breaches) into the target profile after verification.

- **Stealth Browsing**  
  Includes anti-detection mechanisms such as custom headers, human-behavior simulation (micro-movements, reading), and session management.

- **Automated Reporting**  
  Generates formal investigative reports in **PDF** format with one click.

---

## System Architecture

The system follows a microservice-like approach inside a Next.js monolith (App Router).

### 1) Core (The Engine)

- **`browser.ts`**  
  Singleton session manager. Maintains the browser instance, manages cookies, and hides automation flags (`navigator.webdriver`).

- **`interceptor.ts`**  
  Network-layer listener. Analyzes responses to detect user objects and geolocation metadata.

### 2) Data Layer

- **Prisma ORM**  
  Maps TypeScript objects to a relational database (PostgreSQL/MySQL).

- **`services.ts`**  
  Business logic for persistence (Upsert), ensuring relationship consistency between entities.

### 3) Interface (Dashboard)

- **Server Actions**  
  Bridge between frontend and the scraping engine.

- **UI Components**  
  Analytical modules (`IntelPanel`, `IdentityPanel`, `SocialMap3D`) connected in the main management view.

---

## Tech Stack

- **Frontend / App**: Next.js (App Router), TypeScript
- **Automation**: Puppeteer (headless / stealth browsing)
- **Database**: PostgreSQL (recommended) / MySQL, Prisma ORM
- **Process Management** (VPS): PM2
- **Reverse Proxy / SSL** (optional): Nginx, Let’s Encrypt (Certbot)

---

## Quick Start

If you want the fastest path on a VPS (Ubuntu/Debian):

1. Clone the repo
2. Run the automated installer
3. Provide `instagram_cookies.json`
4. Open `http://<server-ip>:3000`

```bash
git clone https://github.com/ACSiskin/vesper_v1.0.git
cd vesper
chmod +x build_vesper.py
sudo python3 build_vesper.py
```

---

## Installation & Deployment

VESPER can be installed in two ways: automated (recommended for VPS servers like Ubuntu/Debian) or manual (for development environments).

### Option A: Automated Installation (VPS / Zero-to-Hero)

The repository includes an integrated Python deployment script that installs all dependencies (Node.js, Docker, PM2, system Chromium packages), configures the database, and runs the app in the background.

**1) Clone the repository and enter the directory:**
```bash
git clone https://github.com/ACSiskin/vesper_v1.0.git
cd vesper
```

**2) Grant permissions and run the script as root**  
```bash
chmod +x build_vesper.py
sudo python3 build_vesper.py
```

The script will start containers, build the system, and run it on port **3000**.

---

### Option B: Manual Installation (Development Environment)

**Requirements:** Node.js v18+, PostgreSQL/MySQL installed, and an OS with Google Chrome installed.

**Install dependencies:**
```bash
npm install
```

**Environment:** configure `.env` with `DATABASE_URL`.

**Database:**
```bash
npx prisma generate
npx prisma db push
```

**Run:**
```bash
npm run dev
```

---

## CRITICAL STEP (For both options)

To allow Puppeteer to bypass Instagram login blocks, you must provide cookies from an active session.

Export your cookies from the browser (e.g., using the EditThisCookie extension in JSON format) and paste them into:

- `instagram_cookies.json` (in the project root)

---

## Environment Variables

Create a `.env` file in the project root.

Minimum:

```bash
# Database connection string for Prisma
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/vesper?schema=public"
```

Optional (for 3D GEOINT map):

```bash
# Mapbox token required for the SocialMap3D module
NEXT_PUBLIC_MAPBOX_TOKEN="YOUR_MAPBOX_TOKEN"
```

---

## Optional: Domain + SSL (Nginx + Let's Encrypt)

If you installed the system on a VPS (Option A), the app runs on port **3000**. Below is how to expose it publicly under your domain (e.g., `osint.yourdomain.com`) with a free SSL certificate.

### 1) Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2) Create an Nginx config for your domain
```bash
sudo nano /etc/nginx/sites-available/vesper
```

Paste the following content (replace `yourdomain.com` with your domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000; # Port where VESPER runs (via PM2)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward real client IP (useful for logs)
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3) Enable the config and reload Nginx
```bash
sudo ln -s /etc/nginx/sites-available/vesper /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4) Generate a free SSL certificate (HTTPS)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the on-screen instructions (email + agree to redirect HTTP → HTTPS).

Done! Your system is now securely available at `https://yourdomain.com`.

---

## User Guide

### 1) Start a Scan

On the welcome screen (`WelcomeScreen`), enter the target username.

Choose the scan mode (**Quick** or **Deep**) and set the post limit.

Watch logs in the developer panel (`Terminal.tsx`) to track engine progress live.

### 2) Data Analysis (Dashboard)

After the scan, the system redirects you to the interactive dashboard (`MainView`):

- **Intel Panel**: Verify so-called “Ghost Data” (hidden emails and phone numbers from APIs).
- **Identity Panel**: Confirm (“promote”) links to breach records.
- **SocialMap3D**: Map historical locations (requires `NEXT_PUBLIC_MAPBOX_TOKEN`).

### 3) Export Report

In the profile header (`TargetHeader`), click **"Export PDF"** to generate a comprehensive investigative report including a psychological profile, relationship graph, and activity map.

---

## Security & Operational Notes

- **Keep cookies private**: `instagram_cookies.json` contains session tokens. Treat it like a password.
- **Don’t commit secrets**: Add `.env` and `instagram_cookies.json` to `.gitignore`.
- **Rate limiting**: Instagram may block aggressive behavior. Prefer **Deep scan** only when needed and use realistic delays.
- **VPS hardening**: If exposing publicly, use a firewall (e.g., UFW) and keep the server updated.
- **Legal**: Always operate with explicit authorization for any target.

---

## Troubleshooting

### Instagram login blocks / scan fails immediately
- Ensure `instagram_cookies.json` is valid and recently exported.
- Re-export cookies from a logged-in session.
- Confirm the cookie JSON format is correct.

### Puppeteer / Chromium errors on Linux
- Install missing system libs (automated installer should handle most cases).
- If running in Docker, ensure the container has required dependencies and correct sandbox flags.

### Map is blank / SocialMap3D not working
- Confirm `NEXT_PUBLIC_MAPBOX_TOKEN` is set.
- Restart the Next.js server after updating `.env`.

### Database errors (Prisma)
- Confirm `DATABASE_URL` is correct.
- Run:
```bash
npx prisma generate
npx prisma db push
```

---

## Legal Notice (Disclaimer)

VESPER is intended **exclusively** for educational, research, and authorized OSINT testing purposes.

- The authors are not responsible for misuse of the tool.
- Automated data collection may violate social platform Terms of Service.
- Users must comply with local privacy regulations (including GDPR/RODO).

2026 VESPER Project. All Rights Reserved.
---

## Appendix: Detailed User Instructions (Expanded)

### 1) Start a Scan
On the welcome screen (**`WelcomeScreen`**), enter the target username.

- Select the scan mode (**Quick** or **Deep**)
- Set the post limit
- Watch logs in the developer panel (**`Terminal.tsx`**) to track engine progress live

### 2) Data Analysis (Dashboard)
After the scan, the system redirects you to the interactive dashboard (**`MainView`**):

- **Intel Panel**: Verification of so-called **“Ghost Data”** (hidden emails and phone numbers surfaced from API responses)
- **Identity Panel**: Module for confirming (“promoting”) links to breach database records
- **SocialMap3D**: Mapping historical locations (requires configuring **`NEXT_PUBLIC_MAPBOX_TOKEN`**)

### 3) Export Report
In the profile header (**`TargetHeader`**), click **“Export PDF”** to generate a comprehensive investigative report including a psychological profile, relationship graph, and activity map.
