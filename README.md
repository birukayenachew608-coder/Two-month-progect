# JobLink Ethiopia 🇪🇹 - Empowering Ethiopian Youth

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![License](https://img.shields.io/badge/License-ISC-blue?style=for-the-badge)](LICENSE)

> A modern, full-stack recruitment and employment ecosystem tailored for Ethiopia. JobLink Ethiopia bridges the gap between emerging local talent and top employers through streamlined job matching, verified credentials, and powerful hiring workflows.

---

## 📌 Overview

**JobLink Ethiopia** is a full-stack web application engineered to address youth employment challenges across Ethiopia. The platform provides an end-to-end recruitment marketplace where:
- **Job Seekers** discover curated career opportunities, apply seamlessly with standardized CV profiles, and track hiring stages.
- **Employers** publish job openings, manage applicant pipelines via an interactive visual Kanban board, and verify company legitimacy.
- **Administrators** uphold ecosystem safety with robust moderation, job report resolution, KYC verification, and IP whitelisting.

---

## 🛠️ Tech Stack

### 🎨 Frontend
- **Markup**: Semantic HTML5 (SEO & Accessibility optimized)
- **Styling**: Vanilla CSS3 with a custom Design System
  - Native CSS Variables, Responsive Fluid Grids & Flexbox
  - Mobile-First Architecture (strictly downscaled for small viewports)
  - Dark Mode & Light Mode Theme Support
- **Client Logic**: Vanilla JavaScript (ES6+ Asynchronous Fetch API, DOM manipulation)
- **Icons**: Font Awesome 6 & Heroicons (SVG)

### ⚙️ Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: 
  - JWT (JSON Web Tokens) with HTTP-Only Cookie Persistence
  - Google OAuth 2.0 & LinkedIn OpenID Integration (Passport.js)
  - Two-Factor Authentication (2FA TOTP with QR Code generation via Speakeasy)
- **Security**: BCrypt password hashing, Express Rate Limiting, IP Whitelisting, Role-Based Access Control (RBAC)
- **File Uploads**: Multer (Secure handling of CVs, resumes, and company logos)
- **Email Service**: Nodemailer (Automated transactional emails & application notifications)
- **Payments**: Chapa Payment Gateway API integration (Freemium tier upgrades)

### 🗄️ Database
- **Database Engine**: MySQL (Relational schema with foreign keys, cascaded updates, and indexed queries)
- **Driver**: `mysql2/promise` connection pooling for concurrent requests

---

## ✨ Key Features

### 👤 Job Seeker Experience
- **Smart Discovery**: Live search by keyword, job title, company name, and Ethiopian regions/cities.
- **Rich Job Details**: Comprehensive job overview displaying deadline countdowns, job types, salary ranges, and company profiles.
- **Saved Jobs / Bookmarks**: Save listings to a private dashboard for quick access anytime.
- **One-Click Apply**: Submit job applications with attached resume/CV and tailored cover notes.
- **Profile & Resume Hub**: Manage personal details, social links (GitHub, LinkedIn, Portfolio), and uploaded CV documents.
- **Email Alerts**: Receive notifications on application status updates and new matching positions.

### 🏢 Employer Hub
- **Executive Dashboard**: Real-time overview of active listings, total applications, and hiring conversion rates.
- **Job Creation & Management**: Publish vacancies with customizable deadlines, tags (Full-time, Remote, Internship), and requirements.
- **Visual Kanban Pipeline**: Drag-and-drop / stage-based applicant tracking (Pending, Under Review, Shortlisted, Hired, Rejected).
- **Application Review**: Direct access to applicant resumes, portfolio links, and contact channels.
- **Freemium & Payment Integration**: Complimentary initial job postings with automated Chapa gateway upgrades for premium listing tiers.

### 🛡️ Admin & Moderation Suite
- **Reported Jobs Management**: Review, investigate, dismiss reports, or permanently remove fraudulent listings.
- **Employer Verification**: Validate business licenses and verify employer accounts to earn the trusted verification badge.
- **User Governance**: Temporary restrictions, bans, or account revocations for policy violations.
- **Platform Security**: IP whitelisting for administrative interfaces and TOTP two-factor authentication (2FA).

### 🌓 Responsive UI & Theming
- **Adaptive Layout**: Mobile-first responsive design ensuring seamless operation across smartphones, tablets, and wide monitors.
- **Light / Dark Mode**: One-click theme toggle that persists across page refreshes with zero flash of unstyled content.
- **High-Performance Design**: Zero heavy frontend frameworks — lightning-fast load times and pure vanilla performance.

---

## 📂 Project Structure

```text
INSA_2moon/
├── .gitignore                     # Root gitignore (protects node_modules & .env)
├── README.md                      # Project documentation
├── JobLinkEthiopia/
│   ├── backend/
│   │   ├── config/                # Database pool & environment configuration
│   │   ├── controllers/           # API request controllers (auth, jobs, admin, etc.)
│   │   ├── middleware/            # JWT auth, IP whitelist, rate limiter
│   │   ├── routes/                # Express API routes
│   │   ├── uploads/               # Uploaded candidate CVs and employer logos
│   │   ├── utils/                 # Email templates, helpers & validators
│   │   ├── database.sql           # Database schema & initial seeding
│   │   ├── package.json           # Backend dependencies and start scripts
│   │   ├── server.js              # Main Express application entry point
│   │   └── .env.example           # Environment variable template
│   ├── frontend/
│   │   ├── css/
│   │   │   └── styles.css         # Unified CSS design system & media queries
│   │   ├── js/
│   │   │   ├── admin.js           # Admin dashboard controllers
│   │   │   ├── employer.js        # Employer portal & applicant pipeline
│   │   │   ├── main.js            # Homepage search, auth modals & job cards
│   │   │   └── seeker.js          # Job seeker profile & saved jobs
│   │   ├── admin.html             # Admin management console
│   │   ├── employer.html          # Employer dashboard & job posting
│   │   ├── index.html             # Homepage & recent job postings
│   │   ├── job-details.html       # Individual job posting & application view
│   │   └── seeker.html            # Job seeker dashboard & profile
│   └── package.json               # Monorepo convenience scripts
```

---

## 🚀 Local Setup Instructions

Follow these steps to set up and run JobLink Ethiopia on your local machine:

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or later)
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) (v8.0+ or XAMPP / MariaDB)
- [Git](https://git-scm.com/)

---

### 2. Clone the Repository

```bash
git clone https://github.com/birukayenachew608-coder/Two-month-progect.git
cd Two-month-progect
```

---

### 3. Install Dependencies

Navigate into the backend directory and install all required npm packages:

```bash
cd JobLinkEthiopia/backend
npm install
```

---

### 4. Database Setup

1. Start your local MySQL service (e.g., via MySQL Workbench, XAMPP, or command line).
2. Create the application database and import the schema:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS joblink_ethiopia;"
mysql -u root -p joblink_ethiopia < database.sql
```

---

### 5. Configure Environment Variables

Create your local `.env` file using the provided `.env.example` template:

```bash
# On Linux / macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` in your text editor and fill in your local configurations:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=joblink_ethiopia
JWT_SECRET=your_super_secret_jwt_key

# Transactional Emails (Optional for local testing)
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_gmail_app_password

# OAuth 2.0 Credentials (Optional)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
LINKEDIN_CALLBACK_URL=http://localhost:3000/api/auth/linkedin/callback

# Chapa Payment Integration (Optional for test mode)
CHAPA_SECRET_KEY=CHASECK_TEST-xxxxxx
CHAPA_WEBHOOK_SECRET=your_webhook_secret
```

---

### 6. Start the Server

Run the start script defined in `package.json`:

```bash
# Run production start script
npm start

# Or run with live-reloading during development
npm run dev
```

Once running, open your browser and navigate to:
```text
http://localhost:3000
```

---

## 🔒 Security Practices

- **Sanitized Inputs & Parameterized Queries**: All MySQL queries utilize prepared statements to prevent SQL Injection.
- **Safe Authentication**: Passwords hashed with BCrypt (10 rounds). Tokens verified through signed JWTs stored in secure cookies.
- **Credential Protection**: Strict `.gitignore` rules prevent private `.env` keys and `node_modules` from entering version control.
- **CORS & Rate Limiting**: Enabled across sensitive authentication endpoints to block brute-force attacks.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **ISC License**. See `LICENSE` for more information.

---

<div align="center">
  <sub>Built with ❤️ for Ethiopian Job Seekers & Employers • JobLink Ethiopia 🇪🇹</sub>
</div>
