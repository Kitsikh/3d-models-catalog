// настройки репозитория
const REPO_OWNER = "Kitsikh";
const REPO_NAME = "halomesh-assets";

// красивое название из имени файла
function formatTitle(filename) {
    return filename
        .replace(/\.[^/.]+$/, "")           
        .replace(/[_-]/g, " ")              
        .replace(/\b\w/g, l => l.toUpperCase());
}

// получение файлов из папки GitHub
async function getFilesFromFolder(folderName) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${folderName}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return data.filter(item => item.type === "file");
    } catch (error) {
        console.error(`Ошибка загрузки папки ${folderName}:`, error);
        return [];
    }
}

// сбор данных о моделях
async function fetchModelsData() {
    const [modelsFiles, imagesFiles] = await Promise.all([
        getFilesFromFolder("models"),
        getFilesFromFolder("images")
    ]);
    
    const glbFiles = modelsFiles.filter(f => f.name.toLowerCase().endsWith('.glb'));
    
    return glbFiles.map((glbFile, index) => {
        const baseName = glbFile.name.replace(/\.glb$/i, "");
        const matchingImage = imagesFiles.find(img => {
            const imgName = img.name.toLowerCase();
            return imgName.startsWith(baseName.toLowerCase()) || imgName.includes(baseName.toLowerCase());
        });
        
        return {
            id: index + 1,
            title: formatTitle(glbFile.name),
            author: "Kitsikh",
            modelSrc: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/models/${glbFile.name}`,
            image: matchingImage ? `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/images/${matchingImage.name}` : null
        };
    });
}

// отрисовка каталога
async function loadCatalog() {
    const catalog = document.getElementById("catalog");
    if (!catalog) return;
    
    catalog.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-secondary);">Загрузка...</p>';
    
    try {
        const catalogData = await fetchModelsData();
        if (catalogData.length === 0) {
            catalog.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-secondary);">Нет моделей</p>';
            return;
        }
        
        catalog.innerHTML = catalogData.map(model => `
            <a href="model.html?id=${model.id}" class="grid-item">
                <div class="grid-item-image-wrapper">
                    ${model.image 
                        ? `<img src="${model.image}" class="grid-item-image" alt="${model.title}" 
                                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                        : ''
                    }
                    <div class="grid-item-placeholder" style="display: ${model.image ? 'none' : 'flex'};">
                        <span>${model.title}</span>
                    </div>
                </div>
                <div class="grid-item-info">
                    <div class="grid-item-title">${model.title}</div>
                    <div class="grid-item-meta">Автор: ${model.author}</div>
                </div>
            </a>
        `).join('');
        
        window.catalogData = catalogData;
    } catch (error) {
        console.error("Ошибка загрузки каталога:", error);
        catalog.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-secondary);">Ошибка загрузки</p>';
    }
}

// страница модели
async function loadModelPage() {
    const container = document.getElementById("model-full-view");
    if (!container) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const modelId = parseInt(urlParams.get("id"));
    
    container.innerHTML = '<p style="text-align:center; padding:40px; color:var(--text-secondary);">Загрузка...</p>';
    
    try {
        if (!window.catalogData) window.catalogData = await fetchModelsData();
        
        const model = window.catalogData.find(m => m.id === modelId);
        if (!model) {
            container.innerHTML = '<p style="padding:40px; text-align:center; color:var(--text-secondary);">Модель не найдена</p>';
            return;
        }
        
        document.querySelector(".page-title").textContent = model.title;
        
        // Вставляем: СНАЧАЛА вьювер, ПОТОМ кнопки
        container.innerHTML = `
            <div class="model-viewer-container">
                <model-viewer 
                    src="${model.modelSrc}" 
                    alt="${model.title}"
                    camera-controls 
                    auto-rotate
                    shadow-intensity="1"
                    style="width: 100%; height: 100%;">
                </model-viewer>
            </div>
            <div class="model-actions">
                <button class="btn btn-primary">Скачать .STL</button>
                <button class="btn btn-secondary">В избранное</button>
            </div>
        `;
        
    } catch (error) {
        console.error("Ошибка загрузки модели:", error);
        container.innerHTML = '<p style="padding:40px; text-align:center; color:var(--text-secondary);">Ошибка загрузки</p>';
    }
}

// переключение темы
const themeBtn = document.getElementById("theme-toggle");
if (themeBtn) {
    if (localStorage.getItem("theme") === "dark") document.body.classList.add("dark-theme");
    themeBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme");
        localStorage.setItem("theme", document.body.classList.contains("dark-theme") ? "dark" : "light");
    });
}

// меню пользователя
const avatarBtn = document.getElementById("avatar-toggle");
const dropdown = document.getElementById("user-dropdown");
if (avatarBtn && dropdown) {
    avatarBtn.addEventListener("click", () => dropdown.classList.toggle("show"));
    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target) && e.target !== avatarBtn) dropdown.classList.remove("show");
    });
}

// запуск
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("catalog")) loadCatalog();
    if (document.getElementById("model-full-view")) loadModelPage();
});