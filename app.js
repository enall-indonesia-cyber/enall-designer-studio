const uploadInput = document.getElementById('uploadInput');
const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');
const placeholderText = document.getElementById('placeholderText');
const aiPrompt = document.getElementById('aiPrompt');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');

let originalImage = null;

// 1. Menangani Upload Gambar ke Canvas
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        
        // PENTING: Menghindari error CORS / "Tainted Canvas" di hosting Netlify
        originalImage.crossOrigin = "anonymous"; 
        
        originalImage.onload = () => {
            // Sesuaikan ukuran canvas dengan gambar asli
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            
            // Gambar ke canvas
            ctx.drawImage(originalImage, 0, 0);
            
            // Tampilkan Canvas, sembunyikan placeholder
            canvas.classList.remove('hidden');
            placeholderText.classList.add('hidden');
            processBtn.disabled = false;
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Helper: Mengubah data URL Canvas menjadi format Base64 bersih untuk Gemini API
function getBase64FromCanvas() {
    const dataUrl = canvas.toDataURL('image/jpeg');
    return dataUrl.split(',')[1];
}

// 2. Menangani Request ke API Gemini
processBtn.addEventListener('click', async () => {
    const promptValue = aiPrompt.value.trim();
    if (!promptValue) {
        statusText.innerText = "⚠️ Tolong masukkan instruksi prompt terlebih dahulu!";
        return;
    }

    statusText.innerText = "⏳ Menghubungkan ke Gemini AI... Mohon tunggu...";
    processBtn.disabled = true;

    try {
        const base64Image = getBase64FromCanvas();

        // Mengambil API Key dari Environment Variable Netlify (Dikonfigurasi di dasbor Netlify)
        // Catatan: Jika menggunakan Vanilla JS mentah di client-side, disarankan menggunakan backend function/proxy, 
        // namun untuk keperluan demo statis sederhana di Netlify, pastikan key disimpan dengan aman.
        const apiKey = window.process?.env?.GEMINI_API_KEY || "MASUKKAN_KEY_DI_DASHBOARD_NETLIFY";

        // Endpoint resmi Gemini 1.5 Flash untuk pemrosesan multimodal (Teks + Gambar)
        const url = `https://googleapis.com{apiKey}`;

        const payload = {
            contents: [{
                parts: [
                    { text: `Tugas Anda adalah memodifikasi gambar ini berdasarkan instruksi berikut: "${promptValue}". Kembalikan hanya gambar hasil edit dalam bentuk format data URL base64 jpeg murni yang siap ditampilkan ke elemen image, tanpa teks tambahan apapun.` },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64Image
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        
        // Membaca teks hasil respons dari Gemini
        const aiResponseText = data.candidates[0].content.parts[0].text.trim();
        
        // Ekstrak string Base64 dari text response (jika dibungkus markdown)
        const base64Clean = aiResponseText.replace(/```.*/g, "").trim();

        // Render kembali hasil modifikasi AI ke Canvas
        const resultImg = new Image();
        resultImg.crossOrigin = "anonymous";
        resultImg.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultImg, 0, 0);
            statusText.innerText = "✅ Foto berhasil diedit oleh AI!";
            downloadBtn.disabled = false;
            processBtn.disabled = false;
        };
        resultImg.src = base64Clean.startsWith('data:') ? base64Clean : `data:image/jpeg;base64,${base64Clean}`;

    } catch (error) {
        console.error(error);
        statusText.innerText = "❌ Gagal memproses gambar. Periksa konsol / API Key Anda.";
        processBtn.disabled = false;
    }
});

// 3. Menangani Fitur Unduh Foto
downloadBtn.addEventListener('click', () => {
    const link = document.createElement('a');
    link.download = 'ai-edited-photo.jpg';
    link.href = canvas.toDataURL('image/jpeg');
    link.click();
});
