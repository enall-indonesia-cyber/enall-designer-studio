// Ambil semua elemen HTML berdasarkan ID masing-masing
const uploadInput = document.getElementById('uploadInput');
const canvas = document.getElementById('photoCanvas');
const ctx = canvas.getContext('2d');
const placeholderText = document.getElementById('placeholderText');
const aiPrompt = document.getElementById('aiPrompt');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusText = document.getElementById('statusText');

let originalImage = null;

// 1. Logika Mengunggah Foto ke Canvas HTML5
uploadInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    statusText.innerText = "⏳ Memuat gambar...";
    
    const reader = new FileReader();
    reader.onload = (event) => {
        originalImage = new Image();
        originalImage.crossOrigin = "anonymous"; 
        
        originalImage.onload = () => {
            canvas.width = originalImage.width;
            canvas.height = originalImage.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(originalImage, 0, 0);
            
            canvas.classList.remove('hidden');
            placeholderText.classList.add('hidden');
            
            processBtn.disabled = false;
            statusText.innerText = "✅ Gambar berhasil dimuat. Silakan masukkan instruksi AI!";
        };
        originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Fungsi pembantu: Mengambil string Base64 dari gambar di canvas
function getBase64FromCanvas() {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    return dataUrl.split(',')[1]; // Mengambil string base64 murni setelah tanda koma
}

// 2. Logika Utama Mengirim Foto ke API Gemini via Header Keamanan (Mendukung Kunci AQ)
processBtn.addEventListener('click', async () => {
    const promptValue = aiPrompt.value.trim();
    if (!promptValue) {
        statusText.innerHTML = "⚠️ <span class='text-amber-400'>Tolong masukkan instruksi prompt terlebih dahulu!</span>";
        return;
    }

    statusText.innerText = "⏳ Menghubungkan ke Gemini AI... Mohon tunggu...";
    processBtn.disabled = true;
    downloadBtn.disabled = true;

    try {
       
        const base64ImageStr = getBase64FromCanvas();
              

      const systemInstruction = `Ubah gambar ini berdasarkan instruksi...`;

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

      statusText.innerText = "🤖 Gemini AI sedang memproses foto...";

      const response = await fetch('/api/gemini', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

        

        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}`);
        }

        const resData = await response.json();
        
        if (!resData.candidates || !resData.candidates[0]?.content?.parts?.[0]?.text) {
            throw new Error("Respons dari AI kosong.");
        }

        const rawAiText = resData.candidates[0].content.parts[0].text.trim();
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
            statusText.innerHTML = "❌ <span class='text-amber-400'>AI gagal menghasilkan format gambar yang benar. Coba ubah prompt Anda.</span>";
            processBtn.disabled = false;
        };

        resultImg.src = cleanBase64;

    } catch (error) {
        console.error("Detail Error:", error);
        statusText.innerHTML = "❌ <span class='text-red-400'>Gagal memproses gambar. Periksa konfigurasi API Key di Netlify Anda.</span>";
        processBtn.disabled = false;
    }
});

// 3. Logika Mengunduh File Hasil Edit Foto
downloadBtn.addEventListener('click', () => {
    statusText.innerText = "📥 Mengunduh gambar...";
    const downloadLink = document.createElement('a');
    downloadLink.download = `ai-photo-edit-${Date.now()}.jpg`;
    downloadLink.href = canvas.toDataURL('image/jpeg', 0.9);
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    statusText.innerHTML = "💾 <span class='text-emerald-400'>Gambar berhasil disimpan!</span>";
});
