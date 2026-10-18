USE defaultdb;

-- ========================================================================
-- 1. Job Seekers Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS job_seekers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) DEFAULT NULL,
    github_id VARCHAR(255) UNIQUE DEFAULT NULL,
    linkedin_id VARCHAR(255) UNIQUE DEFAULT NULL,
    google_id VARCHAR(255) UNIQUE DEFAULT NULL,
    phone_number VARCHAR(50) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    
    -- Profile Photo & Custom Avatars
    profile_photo VARCHAR(500) DEFAULT NULL,
    profile_picture VARCHAR(500) DEFAULT NULL,
    profile_photo_url VARCHAR(500) DEFAULT NULL,
    
    professional_title VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    resume_file_url VARCHAR(255) DEFAULT NULL,
    github_url VARCHAR(255) DEFAULT NULL,
    linkedin_url VARCHAR(255) DEFAULT NULL,
    portfolio_url VARCHAR(255) DEFAULT NULL,
    
    -- Verification & Security
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(255) DEFAULT NULL,
    email_verification_expires DATETIME DEFAULT NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    refresh_token VARCHAR(512) DEFAULT NULL,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 2. Employers Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS employers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    linkedin_id VARCHAR(255) UNIQUE DEFAULT NULL,
    google_id VARCHAR(255) UNIQUE DEFAULT NULL,
    phone_number VARCHAR(50) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    headquarters_location VARCHAR(255) DEFAULT NULL,
    contact_person VARCHAR(255) DEFAULT NULL,
    about_company TEXT DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    
    -- Profile Photo & Custom Avatars
    profile_photo VARCHAR(500) DEFAULT NULL,
    profile_picture VARCHAR(500) DEFAULT NULL,
    profile_photo_url VARCHAR(500) DEFAULT NULL,
    
    -- Freemium & Verification
    free_jobs_posted INT NOT NULL DEFAULT 0,
    is_approved BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    email_verification_code VARCHAR(255) DEFAULT NULL,
    email_verification_expires DATETIME DEFAULT NULL,
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME DEFAULT NULL,
    refresh_token VARCHAR(512) DEFAULT NULL,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 3. Unified Users Table (Cross-Role Authentication & Legacy Support)
-- ========================================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) DEFAULT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) DEFAULT NULL,
    password_hash VARCHAR(255) DEFAULT NULL,
    role ENUM('job_seeker', 'employer', 'admin', 'super_admin', 'seeker') DEFAULT 'job_seeker',
    is_approved BOOLEAN DEFAULT FALSE,
    google_id VARCHAR(255) UNIQUE DEFAULT NULL,
    profile_photo VARCHAR(500) DEFAULT '/uploads/default-avatar.png',
    profile_picture VARCHAR(500) DEFAULT NULL,
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 4. Admins Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin', 'moderator', 'auditor') DEFAULT 'admin',
    profile_photo VARCHAR(500) DEFAULT NULL,
    refresh_token VARCHAR(512) DEFAULT NULL,
    two_factor_secret VARCHAR(255) DEFAULT NULL,
    is_2fa_enabled BOOLEAN DEFAULT FALSE,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 5. Whitelisted IPs Table (Admin Access Control)
-- ========================================================================
CREATE TABLE IF NOT EXISTS whitelisted_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    label VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 6. Jobs Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    job_type VARCHAR(50) DEFAULT 'Full-time',
    location VARCHAR(255) NOT NULL,
    deadline DATE NOT NULL,
    views INT DEFAULT 0,
    
    -- Optional fields from Employer Dashboard
    salary VARCHAR(255) DEFAULT NULL,
    apply_email VARCHAR(255) DEFAULT NULL,
    apply_link VARCHAR(255) DEFAULT NULL,
    
    report_reason TEXT DEFAULT NULL,
    payment_status ENUM('free', 'paid', 'pending') DEFAULT 'free',
    payment_reference VARCHAR(255) DEFAULT NULL,
    status ENUM('open', 'active', 'closed', 'flagged', 'pending_review', 'pending') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 7. Applications Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    seeker_id INT NOT NULL,
    message TEXT DEFAULT NULL,
    status ENUM('pending', 'reviewed', 'rejected', 'hired', 'withdrawn') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 8. Saved Jobs Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seeker_id INT NOT NULL,
    job_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(seeker_id, job_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 9. Job Alerts Table
-- ========================================================================
CREATE TABLE IF NOT EXISTS job_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_seeker_id INT NULL,
    seeker_id INT NULL,
    job_sector VARCHAR(255) NOT NULL DEFAULT 'Software & Tech',
    keyword VARCHAR(255) DEFAULT NULL,
    location VARCHAR(255) DEFAULT 'Addis Ababa',
    frequency ENUM('daily', 'weekly', 'instant') DEFAULT 'daily',
    email_notification BOOLEAN DEFAULT TRUE,
    telegram_notification BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (job_seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 10. Reports Table (Job Flagging & Moderation)
-- ========================================================================
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    user_id INT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_job_id (job_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 11. Pending Verifications Table (Email Verification & OTP)
-- ========================================================================
CREATE TABLE IF NOT EXISTS pending_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(10) NOT NULL,
    expires_at DATETIME NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 12. Payments Table (Chapa Gateway & Freemium Tracking)
-- ========================================================================
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    job_id INT NOT NULL,
    tx_ref VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 300.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
    status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    chapa_response JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 13. Employer Messages Table (Admin to Employer Communication)
-- ========================================================================
CREATE TABLE IF NOT EXISTS employer_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    job_id INT NULL,
    admin_id INT NULL,
    sender VARCHAR(100) DEFAULT 'System Admin',
    subject VARCHAR(255) DEFAULT 'Notice Regarding Job Listing',
    message TEXT NOT NULL,
    status ENUM('sent', 'read') DEFAULT 'sent',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp (employer_id),
    INDEX idx_job (job_id),
    FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- 14. Notifications Table (System & Employer Alerts)
-- ========================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NULL,
    user_id INT NULL,
    job_id INT NULL,
    type VARCHAR(50) DEFAULT 'admin_warning',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_emp_notif (employer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ========================================================================
-- Initial Data Seeding
-- ========================================================================

-- Seed Localhost IPs for IP Whitelist
INSERT IGNORE INTO whitelisted_ips (ip_address, label) 
VALUES ('::1', 'Localhost IPv6'), ('127.0.0.1', 'Localhost IPv4');

-- Seed Default Admin User (Email: birukayenachew608@gmail.com, Password: password123)
INSERT INTO admins (name, email, password, role, is_2fa_enabled)
VALUES ('Admin User', 'birukayenachew608@gmail.com', '$2b$10$4QsUJeeAIAQTT7.ZEJQPZOm1LZfib3MuamMQ9VG8yaJlgGsWffs8m', 'super_admin', false)
ON DUPLICATE KEY UPDATE role = 'super_admin';
