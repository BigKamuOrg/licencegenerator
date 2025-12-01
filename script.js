document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('licenseForm');
    const messageElement = document.getElementById('message');
    const licenseListElement = document.getElementById('licenseList');
    const noLicensesMessage = document.getElementById('noLicenses');
    
    // İstatistik çubuğu elementleri
    const totalLicensesElement = document.getElementById('totalLicenses');
    const enterpriseCountElement = document.getElementById('enterpriseCount');

    // Geçici olarak eklenen lisansları tutacak dizi
    let licenses = []; 

    // Form gönderildiğinde çalışacak fonksiyon
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        const formData = new FormData(this);
        const licenseData = {};
        
        for (const [key, value] of formData.entries()) {
            if (['MaxUsers', 'ExpiryYears'].includes(key)) {
                licenseData[key] = parseInt(value);
            } else {
                licenseData[key] = value.trim();
            }
        }
        
        // JSON yapısını oluşturma
        const newLicense = {
            LicenseConfig: licenseData
        };

        // Lisans Anahtarı oluşturma ve tarih ekleme
        const timestamp = new Date().getTime();
        const currentDate = new Date().toLocaleDateString('tr-TR');
        
        newLicense.LicenseConfig.GeneratedKey = `${licenseData.LicenseKeyPrefix}-${timestamp.toString().slice(-6)}`;
        newLicense.LicenseConfig.CreationDate = currentDate;
        
        licenses.push(newLicense);
        
        // Liste ve istatistikleri güncelleme
        renderLicenseList();
        updateStats();
        
        showMessage(`✅ Yeni Lisans Yapılandırması eklendi. Anahtar: ${newLicense.LicenseConfig.GeneratedKey}`, 'success');
        
        // Formu temizle
        document.getElementById('maxUsers').value = 100;
        document.getElementById('expiryYears').value = 1;
        document.getElementById('licenseType').value = 'ENTERPRISE';
        
    });
    
    // İstatistikleri güncelleyen fonksiyon
    function updateStats() {
        totalLicensesElement.textContent = `Toplam Lisans: ${licenses.length}`;
        
        const enterpriseCount = licenses.filter(
            l => l.LicenseConfig.LicenseType === 'ENTERPRISE'
        ).length;
        enterpriseCountElement.textContent = `Enterprise: ${enterpriseCount}`;
    }

    // Lisansları listede gösteren fonksiyon
    function renderLicenseList() {
        licenseListElement.innerHTML = '';
        
        if (licenses.length === 0) {
            licenseListElement.appendChild(noLicensesMessage);
            noLicensesMessage.classList.remove('hidden');
            return;
        }

        noLicensesMessage.classList.add('hidden');

        // Lisansları tersten listele (en son eklenen en üstte)
        licenses.slice().reverse().forEach((license) => {
            const config = license.LicenseConfig;
            
            const card = document.createElement('div');
            card.className = 'license-card';
            
            card.innerHTML = `
                <h3>${config.CompanyName} (${config.LicenseType})</h3>
                <p><strong>Lisans Anahtarı:</strong> ${config.GeneratedKey || 'N/A'}</p>
                <p><strong>Şirket ID:</strong> ${config.CompanyId}</p>
                <p><strong>Kullanıcı/Yıl:</strong> ${config.MaxUsers} Kullanıcı / ${config.ExpiryYears} Yıl</p>
                <p><strong>Oluşturulma Tarihi:</strong> ${config.CreationDate || 'Bilinmiyor'}</p>
            `;
            
            licenseListElement.appendChild(card);
        });
    }

    // Mesaj gösterme fonksiyonu
    function showMessage(text, type) {
        messageElement.textContent = text;
        messageElement.className = '';
        messageElement.classList.add(type);
        messageElement.classList.remove('hidden');
        
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }
    
    // Sayfa yüklendiğinde istatistikleri ve listeyi ayarla
    updateStats();
    renderLicenseList();
});