document.addEventListener('DOMContentLoaded', () => {
    
    // Module: Navigation Handling
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.tool-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            sections.forEach(sec => {
                if(sec.id === targetId) {
                    sec.classList.remove('hidden');
                } else {
                    sec.classList.add('hidden');
                }
            });
        });
    });

    // Module: Clipboard Utilities
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-copy-target');
            const el = document.getElementById(targetId);
            if(el) {
                navigator.clipboard.writeText(el.innerText || el.value);
                const icon = btn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                icon.style.color = 'var(--accent-primary)';
                setTimeout(() => {
                    icon.className = 'fa-solid fa-copy';
                    icon.style.color = '';
                }, 2000);
            }
        });
    });

    // Module: Password Strength Evaluation
    const pwdInput = document.getElementById('pwd-input');
    const pwdBar = document.getElementById('pwd-strength-bar');
    const pwdStatus = document.getElementById('pwd-status');
    const pwdFeedback = document.getElementById('pwd-feedback');
    const togglePwd = document.getElementById('toggle-pwd-visibility');

    togglePwd.addEventListener('click', () => {
        if(pwdInput.type === 'password') {
            pwdInput.type = 'text';
            togglePwd.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
            pwdInput.type = 'password';
            togglePwd.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
    });

    pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        let score = 0;
        let feedback = [];

        if(val.length === 0) {
            pwdBar.style.width = '0%';
            pwdStatus.innerText = 'Strength: None';
            pwdStatus.style.color = 'var(--text-muted)';
            pwdFeedback.innerHTML = '';
            return;
        }

        if(val.length > 8) { score += 20; feedback.push({msg: "Length > 8", good: true}); }
        else { feedback.push({msg: "Too short (< 8 chars)", good: false}); }

        if(val.length > 12) { score += 10; feedback.push({msg: "Length > 12", good: true}); }

        if(/[A-Z]/.test(val)) { score += 20; feedback.push({msg: "Contains uppercase", good: true}); }
        else { feedback.push({msg: "Missing uppercase", good: false}); }

        if(/[0-9]/.test(val)) { score += 20; feedback.push({msg: "Contains numbers", good: true}); }
        else { feedback.push({msg: "Missing numbers", good: false}); }

        if(/[^A-Za-z0-9]/.test(val)) { score += 30; feedback.push({msg: "Contains symbols", good: true}); }
        else { feedback.push({msg: "Missing special symbols", good: false}); }

        // Determine Strength
        let color = '';
        let label = '';
        if(score < 40) { color = 'var(--text-alert)'; label = 'Weak'; pwdBar.style.width = '33%'; }
        else if (score < 80) { color = 'var(--text-warn)'; label = 'Moderate'; pwdBar.style.width = '66%'; }
        else { color = 'var(--text-safe)'; label = 'Strong'; pwdBar.style.width = '100%'; }

        pwdBar.style.backgroundColor = color;
        pwdStatus.innerText = `Strength: ${label}`;
        pwdStatus.style.color = color;

        pwdFeedback.innerHTML = feedback.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');
    });


    // Module: Cryptographic File Hashing
    const btnHashFile = document.createElement('button');
    btnHashFile.className = 'primary-btn';
    btnHashFile.innerText = 'Select File to Hash';
    btnHashFile.style.marginTop = '15px';
    document.getElementById('file-drop-area').appendChild(btnHashFile);

    btnHashFile.addEventListener('click', async () => {
        if (!window.electronAPI) return alert('Running outside Electron!');
        
        document.getElementById('hash-sha256').innerText = 'Calculating...';
        document.getElementById('hash-sha1').innerText = 'Calculating...';
        document.getElementById('hash-results').classList.remove('hidden');

        const result = await window.electronAPI.hashFile();
        if (result.success) {
            document.getElementById('hash-filename').innerText = result.filename;
            document.getElementById('hash-filesize').innerText = (result.filesize / 1024 / 1024).toFixed(2) + ' MB';
            document.getElementById('hash-sha256').innerText = result.sha256;
            document.getElementById('hash-sha1').innerText = result.sha1;
        } else {
            document.getElementById('hash-results').classList.add('hidden');
            if (result.error !== 'User canceled') alert('Error: ' + result.error);
        }
    });

    // Module: Heuristic URL Analysis
    const btnCheckUrl = document.getElementById('btn-check-url');
    btnCheckUrl.addEventListener('click', () => {
        const urlString = document.getElementById('url-input').value;
        const resDiv = document.getElementById('url-results');
        const statusEl = document.getElementById('url-status');
        const feedbackEl = document.getElementById('url-feedback');
        const scoreText = document.getElementById('url-score-text');
        
        if(!urlString) return;
        resDiv.classList.remove('hidden');

        let isSafe = true;
        let reasons = [];
        let score = 10;

        try {
            const url = new URL(urlString.startsWith('http') ? urlString : 'http://' + urlString);
            
            if (url.protocol !== 'https:') {
                isSafe = false; score -= 4;
                reasons.push({msg: "Uses HTTP instead of HTTPS (Not encrypted)", good: false});
            } else {
                reasons.push({msg: "Uses HTTPS (Encrypted connection)", good: true});
            }

            if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname)) {
                isSafe = false; score -= 5;
                reasons.push({msg: "Hostname is an IP address (Common in phishing)", good: false});
            }

            if (url.hostname.length > 50) {
                isSafe = false; score -= 2;
                reasons.push({msg: "Unusually long hostname", good: false});
            }

            const suspChars = ['@', '-', '_'];
            let charCount = 0;
            suspChars.forEach(c => charCount += (url.hostname.match(new RegExp(`\\${c}`, 'g')) || []).length);
            if (charCount > 3) {
                isSafe = false; score -= 2;
                reasons.push({msg: "Multiple hyphens/special characters in domain", good: false});
            }
            
        } catch (e) {
            score = 0;
            isSafe = false;
            reasons.push({msg: "Malformed or invalid URL structure", good: false});
        }

        scoreText.innerText = `${Math.max(0, score)}/10`;
        
        if (score >= 8) {
            statusEl.innerText = "Likely Safe";
            statusEl.style.color = "var(--text-safe)";
        } else if (score >= 5) {
            statusEl.innerText = "Suspicious";
            statusEl.style.color = "var(--text-warn)";
        } else {
            statusEl.innerText = "High Risk";
            statusEl.style.color = "var(--text-alert)";
        }

        feedbackEl.innerHTML = reasons.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');
    });


    // Module: Network Diagnostics
    const btnNetScan = document.getElementById('btn-fetch-network');
    btnNetScan.innerText = "Run Local Ping Sweep (Subnet)";
    
    // We will change the HTML structure slightly for the network output
    const netResultsContainer = document.getElementById('network-results');
    netResultsContainer.innerHTML = `
        <div class="input-group">
            <input type="text" id="ping-target" placeholder="Enter IP (e.g. 8.8.8.8) or Domain" value="1.1.1.1">
            <button id="exec-ping" class="primary-btn">PING</button>
        </div>
        <div id="net-terminal" class="terminal-output">Waiting for command...</div>
    `;

    document.getElementById('exec-ping').addEventListener('click', async () => {
        if (!window.electronAPI) return alert('Requires Electron backend.');
        const target = document.getElementById('ping-target').value;
        const term = document.getElementById('net-terminal');
        
        netResultsContainer.classList.remove('hidden');
        term.innerText = `> ping ${target}\nExecuting...`;
        
        const res = await window.electronAPI.networkScan(target);
        if (res.success) {
            term.innerText += `\n${res.output}`;
        } else {
            term.innerText += `\n[ERROR] ${res.error}\n${res.output || ''}`;
        }
    });

    btnNetScan.addEventListener('click', async () => {
         if (!window.electronAPI) return alert('Requires Electron backend.');
         const term = document.getElementById('net-terminal');
         netResultsContainer.classList.remove('hidden');
         term.innerText = `> Fetching local interfaces...\n`;
         
         const res = await window.electronAPI.networkScan(null);
         if (res.success) {
             term.innerText += `Hostname: ${res.hostname}\n\n`;
             term.innerText += JSON.stringify(res.interfaces, null, 2);
         }
    });


    // Module: AES-256-GCM Encryption
    const encTabs = document.querySelectorAll('[data-enc-tab]');
    encTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            encTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            if(tab.getAttribute('data-enc-tab') === 'encrypt') {
                document.getElementById('enc-encrypt-tab').classList.remove('hidden');
                document.getElementById('enc-decrypt-tab').classList.add('hidden');
            } else {
                document.getElementById('enc-decrypt-tab').classList.remove('hidden');
                document.getElementById('enc-encrypt-tab').classList.add('hidden');
            }
            document.getElementById('crypto-results').classList.add('hidden');
        });
    });

    document.getElementById('btn-encrypt').addEventListener('click', async () => {
        if (!window.electronAPI) return alert('Requires Electron backend.');
        const text = document.getElementById('enc-input-text').value;
        const pass = document.getElementById('enc-password').value;
        if (!text || !pass) return alert('Text and password required');

        const res = await window.electronAPI.encryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerText = 'Encrypted Ciphertext (AES-256-GCM)';
            document.getElementById('crypto-output').innerText = res.result;
        } else {
            alert('Encryption failed: ' + res.error);
        }
    });

    document.getElementById('btn-decrypt').addEventListener('click', async () => {
        if (!window.electronAPI) return alert('Requires Electron backend.');
        const text = document.getElementById('dec-input-text').value;
        const pass = document.getElementById('dec-password').value;
        if (!text || !pass) return alert('Ciphertext and password required');

        const res = await window.electronAPI.decryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerText = 'Decrypted Plaintext';
            document.getElementById('crypto-output').innerText = res.result;
        } else {
            alert(res.error);
        }
    });

});
