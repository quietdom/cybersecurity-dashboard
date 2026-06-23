# Personal Cybersecurity Dashboard

A robust, cross-platform desktop application built with Electron and Node.js that provides a centralized suite of essential cybersecurity utilities.

## Technical Architecture

*   **Frontend Environment**: HTML5, CSS3 (Custom ImGui-inspired responsive dark theme), and Vanilla JavaScript.
*   **Backend Environment**: Node.js integrated via Electron.
*   **Security Architecture**: Employs Inter-Process Communication (IPC) via `contextBridge` to securely isolate the Chromium rendering engine from raw Node.js system APIs, ensuring a secure desktop environment.

## Core Modules and Implementation

### 1. Cryptographic File Integrity Check
Utilizes Node.js native `crypto` module (`crypto.createHash`) combined with `fs.readFileSync`. This architectural decision bypasses browser memory limitations and streams data directly from the OS, allowing for rapid calculation of **SHA-256**, **SHA-1**, and **MD5** hashes even on very large files without crashing the rendering process.

### 2. Network Diagnostics Engine
Leverages the Node.js `child_process` module to interface directly with the host operating system's networking utilities. This allows the application to execute system-level ICMP ping requests and enumerate local network interfaces (`os.networkInterfaces()`) in a way that standard web browsers restrict due to CORS and mixed-content policies.

### 3. Authenticated AES-256-GCM Encryption
Implements symmetric encryption using the Galois/Counter Mode (GCM), which provides both data confidentiality and authenticity. 
*   **Key Derivation**: Keys are derived securely using `crypto.pbkdf2Sync` with randomized salts and a high iteration count (100,000 iterations) to defend against dictionary attacks.
*   **Initialization Vectors**: Uses cryptographically secure random IVs for every encryption operation.

### 4. Password Entropy & URL Heuristics
*   **Password Module**: Statically evaluates password strength based on length, character set diversity (uppercase, lowercase, numerical, symbols), and common predictability patterns.
*   **URL Module**: Performs static heuristic analysis on uniform resource locators to detect insecure protocols (HTTP over HTTPS), IP-based hostnames, and malformed structures indicative of phishing attempts.

## Installation & Usage

### Prerequisites
*   Node.js (v16.x or higher recommended)
*   npm

### Setup
```bash
# Clone the repository
git clone <your-repo-url>

# Navigate into the project directory
cd cybersecurity-dashboard

# Install Electron and dependencies
npm install

# Launch the application
npm start
```

---
*Developed as a demonstration of applying full-stack JavaScript and Node.js to systems-level programming and applied cryptography.*
