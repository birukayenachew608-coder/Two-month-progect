CREATE DATABASE IF NOT EXISTS joblink_ethiopia;
USE joblink_ethiopia;

CREATE TABLE IF NOT EXISTS job_seekers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) DEFAULT NULL,
    github_id VARCHAR(255) UNIQUE DEFAULT NULL,
    linkedin_id VARCHAR(255) UNIQUE DEFAULT NULL,
    phone_number VARCHAR(50) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    profile_photo_url VARCHAR(255) DEFAULT NULL,
    
    professional_title VARCHAR(255) DEFAULT NULL,
    bio TEXT DEFAULT NULL,
    resume_file_url VARCHAR(255) DEFAULT NULL,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    company_name VARCHAR(255) DEFAULT NULL,
    phone_number VARCHAR(50) DEFAULT NULL,
    location VARCHAR(255) DEFAULT NULL,
    profile_photo_url VARCHAR(255) DEFAULT NULL,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin', 'moderator', 'auditor') DEFAULT 'admin',
    refresh_token VARCHAR(512) DEFAULT NULL,
    two_factor_secret VARCHAR(255) DEFAULT NULL,
    is_2fa_enabled BOOLEAN DEFAULT false,
    
    account_status ENUM('active', 'banned', 'pending_verification') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS whitelisted_ips (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ip_address VARCHAR(45) NOT NULL UNIQUE,
    label VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employer_id INT NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    job_type ENUM('Full-time', 'Part-time', 'Contract', 'Internship') DEFAULT 'Full-time',
    location VARCHAR(255) NOT NULL,
    deadline DATE NOT NULL,
    views INT DEFAULT 0,
    
    -- Optional fields from Employer Dashboard
    salary VARCHAR(255) DEFAULT NULL,
    apply_email VARCHAR(255) DEFAULT NULL,
    apply_link VARCHAR(255) DEFAULT NULL,
    
    status ENUM('active', 'closed', 'flagged', 'pending_review') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (employer_id) REFERENCES employers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    seeker_id INT NOT NULL,
    status ENUM('pending', 'reviewed', 'rejected', 'hired', 'withdrawn') DEFAULT 'pending',
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS saved_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seeker_id INT NOT NULL,
    job_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    UNIQUE(seeker_id, job_id)
);

CREATE TABLE IF NOT EXISTS job_alerts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seeker_id INT NOT NULL,
    keyword VARCHAR(255) NOT NULL,
    location VARCHAR(255) DEFAULT NULL,
    frequency ENUM('daily', 'weekly', 'instant') DEFAULT 'daily',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (seeker_id) REFERENCES job_seekers(id) ON DELETE CASCADE
);
