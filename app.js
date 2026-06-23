document.addEventListener('DOMContentLoaded', () => {
    
    // --- Module: Live System Telemetry (Chart.js) ---
    const ctx = document.getElementById('liveSystemChart');
    if (ctx && window.Chart) {
        const sysChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [
                    { label: 'CPU Usage (%)', data: Array(30).fill(0), borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                    { label: 'RAM Usage (%)', data: Array(30).fill(0), borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                animation: { duration: 0 },
                plugins: { legend: { labels: { color: '#f3f4f6', font: { family: 'JetBrains Mono' } } } },
                scales: { 
                    y: { min: 0, max: 100, grid: { color: '#27272a' }, ticks: { color: '#9ca3af' } },
                    x: { grid: { color: '#27272a' } }
                } 
            }
        });
        
        setInterval(async () => {
            if (window.electronAPI) {
                const stats = await window.electronAPI.getSystemStats();
                sysChart.data.datasets[0].data.shift();
                sysChart.data.datasets[0].data.push(stats.cpu);
                sysChart.data.datasets[1].data.shift();
                sysChart.data.datasets[1].data.push(stats.ram);
                sysChart.update();
            }
        }, 1000);
    }

    // --- Module: Navigation Handling ---
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.tool-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(sec => {
                if(sec.id === targetId) sec.classList.remove('hidden');
                else sec.classList.add('hidden');
            });
        });
    });

    // --- Module: Clipboard Utilities ---
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

    // --- Module: Password Strength & Leak Checking ---
    const pwdInput = document.getElementById('pwd-input');
    if (pwdInput) {
        const pwdBar = document.getElementById('pwd-strength-bar');
        const pwdStatus = document.getElementById('pwd-status');
        const pwdFeedback = document.getElementById('pwd-feedback');
        const pwdLeakStatus = document.getElementById('pwd-leak-status');
        const togglePwd = document.getElementById('toggle-pwd-visibility');
        let leakCheckTimeout;

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

            clearTimeout(leakCheckTimeout);
            pwdLeakStatus.innerHTML = '';

            if(val.length === 0) {
                pwdBar.style.width = '0%';
                pwdStatus.innerText = 'Strength: None';
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

            let color = '', label = '', badgeClass = '';
            if(score < 40) { color = 'var(--text-alert)'; label = 'Weak'; badgeClass = 'badge-alert'; pwdBar.style.width = '33%'; }
            else if (score < 80) { color = 'var(--text-warn)'; label = 'Moderate'; badgeClass = 'badge-warn'; pwdBar.style.width = '66%'; }
            else { color = 'var(--text-safe)'; label = 'Strong'; badgeClass = 'badge-safe'; pwdBar.style.width = '100%'; }

            pwdBar.style.backgroundColor = color;
            pwdStatus.innerHTML = `Strength: <span class="badge ${badgeClass}">${label}</span>`;
            pwdFeedback.innerHTML = feedback.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');

            if (window.electronAPI) {
                pwdLeakStatus.innerHTML = '<span class="badge badge-warn">Checking leaks...</span>';
                leakCheckTimeout = setTimeout(async () => {
                    const res = await window.electronAPI.checkPasswordLeak(val);
                    if (res.success) {
                        if (res.leaked) {
                            pwdLeakStatus.innerHTML = `<span class="badge badge-alert">Compromised</span> This password has been seen ${res.count} times in known data breaches!`;
                        } else {
                            pwdLeakStatus.innerHTML = `<span class="badge badge-safe">Secure</span> No known data breaches found.`;
                        }
                    } else {
                        const errorMsg = res.error.includes('ENOTFOUND') 
                            ? 'Network error: Cannot reach the leak database. Check your internet connection.' 
                            : res.error;
                        pwdLeakStatus.innerHTML = `<span class="badge badge-alert">Error</span> ${errorMsg}`;
                    }
                }, 800);
            }
        });
    }

    // --- Module: Cryptographic File Hashing ---
    const fileDropArea = document.getElementById('file-drop-area');
    if (fileDropArea) {
        fileDropArea.addEventListener('click', async () => {
            if (!window.electronAPI) return alert('Running outside Electron!');
            
            document.getElementById('hash-sha256').innerText = 'Calculating...';
            document.getElementById('hash-sha1').innerText = 'Calculating...';
            document.getElementById('hash-results').classList.remove('hidden');
            document.getElementById('hash-match-status').innerHTML = '';

            const expectedHash = document.getElementById('expected-hash').value.trim().toLowerCase();
            const result = await window.electronAPI.hashFile();
            
            if (result.success) {
                document.getElementById('hash-filename').innerText = result.filename;
                document.getElementById('hash-filesize').innerText = (result.filesize / 1024 / 1024).toFixed(2) + ' MB';
                document.getElementById('hash-sha256').innerText = result.sha256;
                document.getElementById('hash-sha1').innerText = result.sha1;

                if (expectedHash) {
                    if (expectedHash === result.sha256 || expectedHash === result.sha1 || expectedHash === result.md5) {
                        document.getElementById('hash-match-status').innerHTML = '<span class="badge badge-safe">Integrity Verified</span> Hash matches expected value.';
                    } else {
                        document.getElementById('hash-match-status').innerHTML = '<span class="badge badge-alert">Tampered / Mismatch</span> Hash does NOT match expected value!';
                    }
                }
            } else {
                document.getElementById('hash-results').classList.add('hidden');
                if (result.error !== 'User canceled') alert('Error: ' + result.error);
            }
        });
    }

    // --- Module: Heuristic URL Analysis ---
    const btnCheckUrl = document.getElementById('btn-check-url');
    if (btnCheckUrl) {
        btnCheckUrl.addEventListener('click', () => {
            const urlString = document.getElementById('url-input').value;
            const resDiv = document.getElementById('url-results');
            const statusEl = document.getElementById('url-status');
            const feedbackEl = document.getElementById('url-feedback');
            const scoreText = document.getElementById('url-score-text');
            
            if(!urlString) return;
            resDiv.classList.remove('hidden');

            let isSafe = true, score = 10, reasons = [];
            try {
                const url = new URL(urlString.startsWith('http') ? urlString : 'http://' + urlString);
                if (url.protocol !== 'https:') { isSafe = false; score -= 4; reasons.push({msg: "Uses HTTP (Not encrypted)", good: false}); }
                else { reasons.push({msg: "Uses HTTPS (Encrypted)", good: true}); }

                if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname)) { isSafe = false; score -= 5; reasons.push({msg: "Hostname is an IP address", good: false}); }
                if (url.hostname.length > 50) { isSafe = false; score -= 2; reasons.push({msg: "Unusually long hostname", good: false}); }

                let charCount = 0;
                ['@', '-', '_'].forEach(c => charCount += (url.hostname.match(new RegExp(`\\${c}`, 'g')) || []).length);
                if (charCount > 3) { isSafe = false; score -= 2; reasons.push({msg: "Multiple special characters in domain", good: false}); }
            } catch (e) {
                score = 0; isSafe = false; reasons.push({msg: "Malformed URL", good: false});
            }

            scoreText.innerText = `${Math.max(0, score)}/10`;
            if (score >= 8) statusEl.innerHTML = `<span class="badge badge-safe">Likely Safe</span>`;
            else if (score >= 5) statusEl.innerHTML = `<span class="badge badge-warn">Suspicious</span>`;
            else statusEl.innerHTML = `<span class="badge badge-alert">High Risk</span>`;

            feedbackEl.innerHTML = reasons.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');
        });
    }

    // --- Module: Network Diagnostics (Ping Sweep) ---
    const btnNetScan = document.getElementById('btn-fetch-network');
    const execPing = document.getElementById('exec-ping');
    if (btnNetScan) {
        btnNetScan.addEventListener('click', async () => {
             if (!window.electronAPI) return;
             const term = document.getElementById('net-terminal');
             term.innerText = `> Fetching local interfaces...\n`;
             const res = await window.electronAPI.networkScan(null);
             if (res.success) term.innerText += `Hostname: ${res.hostname}\n\n${JSON.stringify(res.interfaces, null, 2)}`;
        });
    }
    if (execPing) {
        execPing.addEventListener('click', async () => {
            if (!window.electronAPI) return;
            const target = document.getElementById('ping-target').value;
            const term = document.getElementById('net-terminal');
            term.innerText = `> ping ${target}\nExecuting...`;
            const res = await window.electronAPI.networkScan(target);
            if (res.success) term.innerText += `\n${res.output}`;
            else term.innerText += `\n[ERROR] ${res.error}\n${res.output || ''}`;
        });
    }

    // --- Module: TCP Port Scanner ---
    const btnRunScan = document.getElementById('btn-run-scan');
    if (btnRunScan) {
        btnRunScan.addEventListener('click', async () => {
            if (!window.electronAPI) return;
            const target = document.getElementById('scan-target').value;
            const portsInput = document.getElementById('scan-ports').value;
            const ports = portsInput.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
            
            const term = document.getElementById('scan-terminal');
            document.getElementById('scan-results').classList.remove('hidden');
            term.innerText = `> Scanning ${target} on ${ports.length} ports...\n`;

            const res = await window.electronAPI.portScan(target, ports);
            if (res.success) {
                term.innerText += `\nScan Complete:\n`;
                res.results.forEach(r => {
                    term.innerText += `Port ${r.port}: ${r.status.toUpperCase()}\n`;
                });
            } else {
                term.innerText += `\n[ERROR] Failed to execute scan.`;
            }
        });
    }

    // --- Module: Endpoint Process Monitor ---
    const btnRefreshProcs = document.getElementById('btn-refresh-procs');
    const procSearch = document.getElementById('proc-search');
    let allProcesses = [];
    const suspiciousList = ['nmap.exe', 'wireshark.exe', 'nc.exe', 'netcat.exe', 'mimikatz.exe', 'psexec.exe', 'cmd.exe', 'powershell.exe'];
    
    // Expose globally for inline onclick attribute
    window.killProc = async (pid) => {
        if (!confirm('Are you sure you want to forcibly terminate process PID: ' + pid + '?')) return;
        if (!window.electronAPI) return;
        const res = await window.electronAPI.killProcess(pid);
        if (res.success) {
            alert('Process ' + pid + ' terminated successfully.');
            if (btnRefreshProcs) btnRefreshProcs.click();
        } else {
            alert('Failed to terminate process: ' + res.error);
        }
    };

    if (btnRefreshProcs) {
        const renderTable = (filter = '') => {
            const tbody = document.querySelector('#proc-table tbody');
            tbody.innerHTML = '';
            const filtered = allProcesses.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()) || p.pid.includes(filter));
            
            if (filtered.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="text-center">No processes found.</td></tr>`;
                return;
            }

            filtered.forEach(p => {
                const isSuspicious = suspiciousList.includes(p.name.toLowerCase());
                const nameHtml = isSuspicious 
                    ? `<span style="color: var(--text-alert); font-weight: bold;">${p.name} <span class="badge badge-alert">Suspicious</span></span>`
                    : p.name;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${p.pid}</td>
                    <td>${nameHtml}</td>
                    <td>${p.memory}</td>
                    <td>
                        <button class="primary-btn" style="padding: 4px 8px; font-size: 0.7rem; background-color: var(--text-alert);" onclick="window.killProc('${p.pid}')">Kill</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        };

        btnRefreshProcs.addEventListener('click', async () => {
            if (!window.electronAPI) return;
            document.querySelector('#proc-table tbody').innerHTML = `<tr><td colspan="4" class="text-center">Fetching processes...</td></tr>`;
            const res = await window.electronAPI.getProcesses();
            if (res.success) {
                allProcesses = res.processes;
                renderTable(procSearch.value);
            } else {
                document.querySelector('#proc-table tbody').innerHTML = `<tr><td colspan="4" class="text-center"><span class="badge badge-alert">Error</span> ${res.error}</td></tr>`;
            }
        });

        procSearch.addEventListener('input', (e) => {
            renderTable(e.target.value);
        });
    }

    // --- Module: Email Header Analyzer ---
    const btnAnalyzeEmail = document.getElementById('btn-analyze-email');
    if (btnAnalyzeEmail) {
        btnAnalyzeEmail.addEventListener('click', () => {
            const headers = document.getElementById('email-headers-input').value;
            if (!headers) return;

            document.getElementById('email-results').classList.remove('hidden');
            const term = document.getElementById('email-terminal');
            term.innerText = `> Parsing Routing Hops...\n`;

            // Simple RegExp extraction
            let spf = 'N/A', dkim = 'N/A', dmarc = 'N/A';
            const authMatch = headers.match(/Authentication-Results:.*?(?=\n\S|\n$)/is);
            if (authMatch) {
                const authStr = authMatch[0].toLowerCase();
                if (authStr.includes('spf=pass')) spf = '<span class="badge badge-safe">PASS</span>';
                else if (authStr.includes('spf=fail') || authStr.includes('spf=softfail')) spf = '<span class="badge badge-alert">FAIL</span>';

                if (authStr.includes('dkim=pass')) dkim = '<span class="badge badge-safe">PASS</span>';
                else if (authStr.includes('dkim=fail')) dkim = '<span class="badge badge-alert">FAIL</span>';

                if (authStr.includes('dmarc=pass')) dmarc = '<span class="badge badge-safe">PASS</span>';
                else if (authStr.includes('dmarc=fail')) dmarc = '<span class="badge badge-alert">FAIL</span>';
            }

            document.getElementById('email-spf').innerHTML = spf;
            document.getElementById('email-dkim').innerHTML = dkim;
            document.getElementById('email-dmarc').innerHTML = dmarc;

            const receivedMatches = [...headers.matchAll(/Received:\s*(.*?)(?=\n[A-Z]|\n$)/gis)];
            receivedMatches.forEach((m, i) => {
                term.innerText += `\nHop ${i+1}: ${m[1].replace(/\n\s+/g, ' ').substring(0, 100)}...`;
            });
            if (receivedMatches.length === 0) term.innerText += `\nNo routing hops found.`;
        });
    }

    // --- Module: Steganography (LSB) ---
    const stegDropArea = document.getElementById('steg-drop-area');
    const stegInput = document.getElementById('steg-file-input');
    const stegCanvas = document.getElementById('steg-canvas');
    let stegImg = null;

    if (stegDropArea) {
        const stegTabs = document.querySelectorAll('[data-steg-tab]');
        stegTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                stegTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                if(tab.getAttribute('data-steg-tab') === 'encode') {
                    document.getElementById('steg-encode-tab').classList.remove('hidden');
                    document.getElementById('steg-decode-tab').classList.add('hidden');
                } else {
                    document.getElementById('steg-decode-tab').classList.remove('hidden');
                    document.getElementById('steg-encode-tab').classList.add('hidden');
                }
            });
        });

        stegDropArea.addEventListener('click', () => stegInput.click());
        stegInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                        stegImg = img;
                        stegDropArea.innerHTML = `<i class="fa-solid fa-check" style="color:var(--accent-primary)"></i><p>Image Loaded: ${img.width}x${img.height}px</p>`;
                    };
                    img.src = ev.target.result;
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        });

        document.getElementById('btn-steg-encode').addEventListener('click', () => {
            if (!stegImg) return alert('Please load an image first.');
            const msg = document.getElementById('steg-secret-msg').value;
            if (!msg) return alert('Please enter a message to hide.');

            const ctx = stegCanvas.getContext('2d');
            stegCanvas.width = stegImg.width;
            stegCanvas.height = stegImg.height;
            ctx.drawImage(stegImg, 0, 0);

            const imgData = ctx.getImageData(0, 0, stegCanvas.width, stegCanvas.height);
            const data = imgData.data;

            // Encode message length as 32-bit int into first 32 channels (R,G,B only)
            const textEncoder = new TextEncoder();
            const msgBytes = textEncoder.encode(msg);
            const msgLen = msgBytes.length;

            if (msgLen * 8 + 32 > (data.length / 4) * 3) return alert('Message too long for this image!');

            let bitIdx = 0;
            // Write length
            for (let i = 0; i < 32; i++) {
                const pixelIdx = Math.floor(i / 3) * 4 + (i % 3);
                const bit = (msgLen >> i) & 1;
                data[pixelIdx] = (data[pixelIdx] & ~1) | bit;
            }

            bitIdx = 32;
            // Write payload
            for (let i = 0; i < msgLen; i++) {
                for (let j = 0; j < 8; j++) {
                    const dataIdx = bitIdx++;
                    const pixelIdx = Math.floor(dataIdx / 3) * 4 + (dataIdx % 3);
                    const bit = (msgBytes[i] >> j) & 1;
                    data[pixelIdx] = (data[pixelIdx] & ~1) | bit;
                }
            }

            ctx.putImageData(imgData, 0, 0);
            
            // Trigger download
            const link = document.createElement('a');
            link.download = 'steg-encoded.png';
            link.href = stegCanvas.toDataURL('image/png');
            link.click();
        });

        document.getElementById('btn-steg-decode').addEventListener('click', () => {
            if (!stegImg) return alert('Please load an image first.');
            
            const ctx = stegCanvas.getContext('2d');
            stegCanvas.width = stegImg.width;
            stegCanvas.height = stegImg.height;
            ctx.drawImage(stegImg, 0, 0);

            const imgData = ctx.getImageData(0, 0, stegCanvas.width, stegCanvas.height);
            const data = imgData.data;

            let msgLen = 0;
            for (let i = 0; i < 32; i++) {
                const pixelIdx = Math.floor(i / 3) * 4 + (i % 3);
                const bit = data[pixelIdx] & 1;
                msgLen |= (bit << i);
            }

            if (msgLen < 0 || msgLen > 5000000) return alert('No valid hidden message found or payload corrupted.');

            const msgBytes = new Uint8Array(msgLen);
            let bitIdx = 32;

            for (let i = 0; i < msgLen; i++) {
                let byte = 0;
                for (let j = 0; j < 8; j++) {
                    const dataIdx = bitIdx++;
                    const pixelIdx = Math.floor(dataIdx / 3) * 4 + (dataIdx % 3);
                    const bit = data[pixelIdx] & 1;
                    byte |= (bit << j);
                }
                msgBytes[i] = byte;
            }

            const textDecoder = new TextDecoder();
            const resultMsg = textDecoder.decode(msgBytes);

            document.getElementById('steg-decode-results').classList.remove('hidden');
            document.getElementById('steg-output').innerText = resultMsg;
        });
    }

    // --- Module: AES-256-GCM Encryption ---
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
        if (!window.electronAPI) return;
        const text = document.getElementById('enc-input-text').value;
        const pass = document.getElementById('enc-password').value;
        if (!text || !pass) return;
        const res = await window.electronAPI.encryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerHTML = '<span class="badge badge-safe">Encrypted Ciphertext (AES-256-GCM)</span>';
            document.getElementById('crypto-output').innerText = res.result;
        }
    });

    document.getElementById('btn-decrypt').addEventListener('click', async () => {
        if (!window.electronAPI) return;
        const text = document.getElementById('dec-input-text').value;
        const pass = document.getElementById('dec-password').value;
        if (!text || !pass) return;
        const res = await window.electronAPI.decryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerHTML = '<span class="badge badge-safe">Decrypted Plaintext</span>';
            document.getElementById('crypto-output').innerText = res.result;
        } else {
            alert(res.error);
        }
    });
});
