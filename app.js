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
        const base64ImageStr = getBase64FromCanvas();
        
        // Membaca variabel rahasia dari Netlify secara aman
        const apiKey = window.process?.env?.GEMINI_API_KEY || ""; 

        const url = `https://googleapis.com`;

        const systemInstruction = `Ubah gambar ini berdasarkan instruksi user: "\${promptValue}". KETENTUAN WAJIB: Keluarkan HANYA string teks base64 dari gambar hasil edit tanpa penjelasan, tanpa format markdown seperti \`\`\`, dan tanpa kata-kata tambahan apapun. Cukup string base64 gambar jpeg murni.`;

        const payload = {
            contents: [{
                parts: [
                    { text: systemInstruction },
                    {
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64ImageStr
                        }
                    }
                ]
            }]
        };

        statusText.innerText = "🤖 Gemini AI sedang mengedit foto Anda...";

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'x-goog-api-key': apiKey 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const resData = await response.json();
        
        if (!resData.candidates || !resData.candidates.content.parts.text) {
            throw new Error("Respons dari AI kosong.");
        }

        const rawAiText = resData.candidates.content.parts.text.trim();
        let cleanBase64 = rawAiText.replace(/```[a-zA-Z]*/g, "").replace(/```/g, "").trim();
        cleanBase64 = cleanBase64.replace(/\s/g, '');

        if (!cleanBase64.startsWith('data:')) {
            cleanBase64 = `data:image/jpeg;base64,${cleanBase64}`;
        }

        statusText.innerText = "🎨 Menggambar ulang hasil edit AI...";

        const resultImg = new Image();
        resultImg.crossOrigin = "anonymous";
        resultImg.onload = () => {
            canvas.width = resultImg.width;
            canvas.height = resultImg.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(resultImg, 0, 0);
            statusText.innerHTML = "✨ <span class='text-emerald-400 font-bold'>Foto sukses dimodifikasi oleh AI!</span>";
            downloadBtn.disabled = false;
            processBtn.disabled = false;
        };
        
        resultImg.onerror = () => {
            statusText.innerHTML = "❌ <span class='text-amber-400'>AI gagal menghasilkan gambar yang benar.</span>";
            processBtn.disabled = false;
        };

        resultImg.src = cleanBase64;

    } catch (error) {
        console.error("Detail Error:", error);
        statusText.innerHTML = "❌ <span class='text-red-400'>Gagal memproses gambar. Periksa konfigurasi API Key di Netlify.</span>";
        processBtn.disabled = false;
    }
});


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
