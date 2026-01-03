import { App, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext } from 'obsidian';

interface GallerySettings {
    maxColumnsDesktop: number;
    maxColumnsTablet: number;
    maxColumnsMobile: number;
    gapSize: string;
    galleryKeyword: string;
}

const DEFAULT_SETTINGS: GallerySettings = {
    maxColumnsDesktop: 4,
    maxColumnsTablet: 3,
    maxColumnsMobile: 2,
    gapSize: '12px',
    galleryKeyword: 'gallery'
};

export default class ImageGalleryPlugin extends Plugin {
    settings: GallerySettings;
    private zoomLevel: number = 1;
    private isDragging: boolean = false;
    private dragStartX: number = 0;
    private dragStartY: number = 0;
    private dragOffsetX: number = 0;
    private dragOffsetY: number = 0;
    private styleEl: HTMLStyleElement;
    private activeLightbox: HTMLElement | null = null;
    
    // Для обработки свайпов
    private touchStartX: number = 0;
    private touchStartY: number = 0;
    private touchStartTime: number = 0;
    private isSwiping: boolean = false;

    async onload() {
        console.log('Loading Image Gallery plugin');
        
        await this.loadSettings();
        
        // Загружаем статические стили
        this.loadStyles();
        
        // Добавляем динамические стили
        this.addDynamicStyles();
        
        // Регистрируем обработчик блоков кода с настраиваемым ключевым словом
        this.registerMarkdownCodeBlockProcessor(this.settings.galleryKeyword, async (source, el, ctx) => {
            await this.renderGallery(source, el, ctx);
        });
        
        // Добавляем обработку отдельных изображений
        this.setupIndividualImages();
        
        // Добавляем вкладку настроек
        this.addSettingTab(new GallerySettingTab(this.app, this));
    }
    
    loadStyles() {
        // Создаем элемент для статических стилей
        const staticStyleEl = document.createElement('style');
        staticStyleEl.id = 'obsidian-gallery-static-styles';
        document.head.appendChild(staticStyleEl);
        // Стили будут загружены из styles.css автоматически
    }
    
    addDynamicStyles() {
        // Удаляем старый динамический стиль, если есть
        if (this.styleEl) {
            this.styleEl.remove();
        }
        
        this.styleEl = document.createElement('style');
        this.styleEl.id = 'obsidian-gallery-dynamic-styles';
        
        // Обновляем динамические стили с текущими настройками
        this.updateDynamicStyles();
        
        document.head.appendChild(this.styleEl);
    }
    
    updateDynamicStyles() {
        const dynamicCss = `
            .gallery-grid {
                gap: ${this.settings.gapSize};
            }
            
            /* Адаптивная сетка с ограничением максимального количества колонок */
            /* Десктоп */
            @media (min-width: 1024px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsDesktop}, var(--image-count, ${this.settings.maxColumnsDesktop})) - 20px), 1fr));
                }
            }
            
            /* Планшет */
            @media (min-width: 768px) and (max-width: 1023px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsTablet}, var(--image-count, ${this.settings.maxColumnsTablet})) - 20px), 1fr));
                }
            }
            
            /* Мобильный */
            @media (max-width: 767px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsMobile}, var(--image-count, ${this.settings.maxColumnsMobile})) - 20px), 1fr));
                }
            }
            
            /* Стиль для отдельных изображений */
            .markdown-source-view img:not(.gallery-item img),
            .markdown-preview-view img:not(.gallery-item img) {
                cursor: zoom-in;
                transition: opacity 0.2s ease;
            }
            
            .markdown-source-view img:not(.gallery-item img):hover,
            .markdown-preview-view img:not(.gallery-item img):hover {
                opacity: 0.9;
            }
        `;
        
        this.styleEl.textContent = dynamicCss;
    }
    
    async renderGallery(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
        // Очищаем контейнер
        el.empty();
        
        // Создаем контейнер для галереи
        const galleryContainer = el.createDiv({ cls: 'gallery-container' });
        
        // Парсим изображения из блока кода
        const imageRegex = /!\[\[(.*?\.(?:jpg|jpeg|png|gif|bmp|svg|webp|tiff|avif))(?:\|.*?)?\]\]/gi;
        const imageMatches = source.match(imageRegex) || [];
        
        if (imageMatches.length === 0) {
            galleryContainer.setText('No images found in gallery block.');
            return;
        }
        
        // Создаем сетку изображений
        const grid = galleryContainer.createDiv({ cls: 'gallery-grid' });
        
        // Устанавливаем CSS переменную с количеством изображений
        grid.style.setProperty('--image-count', imageMatches.length.toString());
        
        // Собираем данные об изображениях
        const images: Array<{src: string, alt: string}> = [];
        
        for (const match of imageMatches) {
            const fullMatch = match.match(/!\[\[(.*?)(?:\|(.*?))?\]\]/);
            if (!fullMatch) continue;
            
            const filename = fullMatch[1];
            const altText = fullMatch[2] || filename.split('/').pop() || filename;
            
            try {
                // Получаем путь к файлу
                const file = this.app.metadataCache.getFirstLinkpathDest(filename, ctx.sourcePath);
                if (!file) continue;
                
                // Получаем URL ресурса
                const resourcePath = this.app.vault.getResourcePath(file);
                
                // Создаем элемент изображения
                const imgContainer = grid.createDiv({ cls: 'gallery-item' });
                imgContainer.setAttribute('data-src', resourcePath);
                imgContainer.setAttribute('data-alt', altText);
                imgContainer.setAttribute('data-index', images.length.toString());
                
                const img = imgContainer.createEl('img', {
                    attr: {
                        src: resourcePath,
                        alt: altText,
                        loading: 'lazy'
                    }
                });
                
                // Обработчики для галереи
                imgContainer.addEventListener('click', (e) => {
                    if (e.button === 0) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Собираем все изображения из этой галереи
                        const galleryImages = Array.from(grid.querySelectorAll('.gallery-item'))
                            .map(item => ({
                                src: item.getAttribute('data-src') || '',
                                alt: item.getAttribute('data-alt') || ''
                            }));
                        
                        const index = parseInt(imgContainer.getAttribute('data-index') || '0');
                        this.openLightbox(galleryImages, index);
                    }
                });
                
                images.push({
                    src: resourcePath,
                    alt: altText
                });
                
            } catch (error) {
                console.error('Error loading image:', error);
            }
        }
    }
    
    openLightbox(images: Array<{src: string, alt: string}>, startIndex: number) {
        // Закрываем предыдущий lightbox, если есть
        if (this.activeLightbox) {
            this.closeLightbox();
        }
        
        // Создаем backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'lg-backdrop';
        this.activeLightbox = backdrop;
        
        // Создаем контейнер для изображения
        const imageContainer = document.createElement('div');
        imageContainer.className = 'lg-image-container';
        
        // Создаем элемент изображения
        const img = document.createElement('img');
        img.className = 'lg-image';
        
        // Создаем элементы управления
        const prevBtn = this.createButton('←', 'lg-btn lg-prev');
        const nextBtn = this.createButton('→', 'lg-btn lg-next');
        const counter = document.createElement('div');
        counter.className = 'lg-counter';
        
        // Кнопки масштабирования
        //const zoomInBtn = this.createButton('+', 'lg-btn');
        //const zoomOutBtn = this.createButton('-', 'lg-btn');
        //const resetZoomBtn = this.createButton('↻', 'lg-btn');
        
        /*const zoomControls = document.createElement('div');
        zoomControls.className = 'lg-zoom-controls';
        zoomControls.appendChild(zoomInBtn);
        zoomControls.appendChild(zoomOutBtn);
        zoomControls.appendChild(resetZoomBtn);
        */
        
        // Создаем миниатюры, если изображений больше 1
        let thumbnailsContainer: HTMLElement | null = null;
        const thumbs: HTMLImageElement[] = [];
        
        if (images.length > 1) {
            thumbnailsContainer = document.createElement('div');
            thumbnailsContainer.className = 'lg-thumbnails';
            
            images.forEach((image, index) => {
                const thumb = document.createElement('img');
                thumb.className = 'lg-thumbnail';
                thumb.src = image.src;
                thumb.setAttribute('data-index', index.toString());
                thumb.alt = image.alt;
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.updateLightboxImage(images, index, img, counter, thumbs);
                    currentIndex = index;
                    this.resetZoomAndPosition();
                });
                thumbnailsContainer!.appendChild(thumb);
                thumbs.push(thumb);
            });
        }
        
        // Добавляем элементы в backdrop
        backdrop.appendChild(imageContainer);
        imageContainer.appendChild(img);
        
        // Добавляем кнопки навигации только если больше одного изображения
        if (images.length > 1) {
            backdrop.appendChild(prevBtn);
            backdrop.appendChild(nextBtn);
            backdrop.appendChild(thumbnailsContainer!);
        } else {
            // Для одиночных изображений скрываем навигацию и счетчик
            counter.style.display = 'none';
        }
        
        backdrop.appendChild(counter);
        //backdrop.appendChild(zoomControls);
        
        // Добавляем backdrop в DOM
        document.body.appendChild(backdrop);
        
        // Блокируем прокрутку страницы
        document.body.style.overflow = 'hidden';
        
        // Текущий индекс и состояние масштаба
        let currentIndex = startIndex;
        this.zoomLevel = 1;
        this.isDragging = false;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.isSwiping = false;
        
        // Функция обновления изображения
        const updateImage = () => {
            img.src = images[currentIndex].src;
            img.alt = images[currentIndex].alt;
            
            // Сбрасываем трансформации
            img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
            
            // Обновляем счетчик
            counter.textContent = `${currentIndex + 1} / ${images.length}`;
            
            // Обновляем активную миниатюру
            thumbs.forEach((thumb, index) => {
                thumb.classList.toggle('active', index === currentIndex);
            });
            
            // Прокручиваем миниатюру в видимую область
            if (thumbs[currentIndex]) {
                thumbs[currentIndex].scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'center'
                });
            }
        };
        
        // Функция переключения изображения
        const switchImage = (direction: 'next' | 'prev') => {
            if (images.length > 1) {
                if (direction === 'next') {
                    currentIndex = (currentIndex + 1) % images.length;
                } else {
                    currentIndex = (currentIndex - 1 + images.length) % images.length;
                }
                this.resetZoomAndPosition();
                updateImage();
            }
        };
        
        // Функция закрытия lightbox
        const closeLightbox = () => {
            this.closeLightbox();
        };
        
        // Обработчики навигации (только если больше одного изображения)
        if (images.length > 1) {
            prevBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                switchImage('prev');
            });
            
            nextBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                switchImage('next');
            });
        }
        
        // Обработчики масштабирования
        /*zoomInBtn.addEventListener('click', () => {
            this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
            img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
        });
        
        zoomOutBtn.addEventListener('click', () => {
            this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.5);
            img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
        });
        
        resetZoomBtn.addEventListener('click', () => {
            this.resetZoomAndPosition();
            img.style.transform = `translate(0px, 0px) scale(1)`;
        });*/
        
        // Обработчики для двойного клика/тапа (сброс масштаба)
        let lastTapTime = 0;
        
        const handleDoubleTap = (e: MouseEvent | TouchEvent) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Добавляем класс для специальной анимации зума
            img.classList.add('zooming');
            
            // Сбрасываем зум и позицию
            this.resetZoomAndPosition();
            img.style.transform = 'translate(0px, 0px) scale(1)';
            
            // Убираем класс после анимации
            setTimeout(() => {
                img.classList.remove('zooming');
            }, 300);
        };
        
        // Двойной клик мышью
        imageContainer.addEventListener('dblclick', handleDoubleTap);
        
        // Двойной тап на мобильных
        imageContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTapTime;
                
                if (tapLength < 300 && tapLength > 0) {
                    // Двойной тап
                    handleDoubleTap(e);
                }
                
                lastTapTime = currentTime;
            }
        });
        
        // Масштабирование колесиком мыши
        imageContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            this.zoomLevel = Math.max(0.5, Math.min(this.zoomLevel * delta, 5));
            
            img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
        }, { passive: false });
        
        // Перетаскивание изображения (только при зуме > 1)
        const startDrag = (clientX: number, clientY: number) => {
            if (this.zoomLevel > 1) {
                this.isDragging = true;
                imageContainer.classList.add('dragging');
                this.dragStartX = clientX - this.dragOffsetX;
                this.dragStartY = clientY - this.dragOffsetY;
            }
        };
        
        const doDrag = (clientX: number, clientY: number) => {
            if (this.isDragging) {
                this.dragOffsetX = clientX - this.dragStartX;
                this.dragOffsetY = clientY - this.dragStartY;
                img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
            }
        };
        
        const endDrag = () => {
            this.isDragging = false;
            imageContainer.classList.remove('dragging');
        };
        
        // Mouse events для перетаскивания
        imageContainer.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Левая кнопка мыши
                startDrag(e.clientX, e.clientY);
            }
        });
        
        document.addEventListener('mousemove', (e) => {
            doDrag(e.clientX, e.clientY);
        });
        
        document.addEventListener('mouseup', endDrag);
        
        // Touch события для мобильных (добавим свайпы для навигации)
        let initialDistance: number | null = null;
        let initialTouches: TouchList | null = null;
        let isPinching = false;
        
        imageContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                // Начало жеста pinch
                isPinching = true;
                initialDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                initialTouches = e.touches;
                e.preventDefault();
            } else if (e.touches.length === 1 && this.zoomLevel > 1) {
                // Начало перетаскивания увеличенного изображения
                startDrag(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 1) {
                // Запоминаем начальную точку для свайпа
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
                this.touchStartTime = Date.now();
                this.isSwiping = false;
            }
        });
        
        imageContainer.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && initialDistance !== null && initialTouches && isPinching) {
                // Жест pinch zoom
                const currentDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                
                const scale = currentDistance / initialDistance;
                this.zoomLevel = Math.max(0.5, Math.min(this.zoomLevel * scale, 5));
                initialDistance = currentDistance;
                
                img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
                e.preventDefault();
            } else if (e.touches.length === 1 && this.isDragging) {
                // Перетаскивание увеличенного изображения
                doDrag(e.touches[0].clientX, e.touches[0].clientY);
            } else if (e.touches.length === 1 && this.zoomLevel === 1) {
                // Определяем свайп
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                
                // Если движение по горизонтали больше, чем по вертикали, это свайп
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
                    this.isSwiping = true;
                    // Слегка смещаем изображение для визуальной обратной связи
                    img.style.transform = `translate(${deltaX * 0.5}px, 0px) scale(1)`;
                    e.preventDefault();
                }
            }
        });
        
        imageContainer.addEventListener('touchend', (e) => {
            if (isPinching) {
                isPinching = false;
                initialDistance = null;
                initialTouches = null;
            }
            
            endDrag();
            
            if (this.zoomLevel === 1 && !isPinching && !this.isDragging) {
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - this.touchStartX;
                const deltaY = touch.clientY - this.touchStartY;
                const deltaTime = Date.now() - this.touchStartTime;
                
                // Определяем свайп
                const minSwipeDistance = 50;
                const maxSwipeTime = 300;
                
                if (this.isSwiping && Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
                // Свайп влево - следующее изображение
                if (deltaX > 0) {
                    switchImage('prev');
                } 
                // Свайп вправо - предыдущее изображение
                else {
                    switchImage('next');
                }
                e.preventDefault();
            }
                
                // Сбрасываем смещение изображения
                img.style.transform = 'translate(0px, 0px) scale(1)';
            }
            
            this.isSwiping = false;
        });
        
        // Навигация клавишами
        const keyHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeLightbox();
            } else if (images.length > 1) {
                if (e.key === 'ArrowLeft') {
                    switchImage('prev'); // Было 'next'
                } else if (e.key === 'ArrowRight') {
                    switchImage('next'); // Было 'prev'
                }
            }

            if (e.key === '+' || e.key === '=') {
                e.preventDefault();
                this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
                img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
            } else if (e.key === '-' || e.key === '_') {
                e.preventDefault();
                this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.5);
                img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
            } else if (e.key === '0') {
                e.preventDefault();
                this.resetZoomAndPosition();
                img.style.transform = `translate(0px, 0px) scale(1)`;
            }
        };
        
        document.addEventListener('keydown', keyHandler);
        
        // Закрытие по клику на backdrop (любую область)
        backdrop.addEventListener('click', (e) => {
            // Закрываем только если клик был не на элементах управления и не на изображении при зуме = 1
            const target = e.target as HTMLElement;
            if (target === backdrop || 
                (target === imageContainer && this.zoomLevel === 1) ||
                (target === img && this.zoomLevel === 1)) {
                closeLightbox();
            }
        });
        
        // Анимация появления
        setTimeout(() => backdrop.classList.add('in'), 10);
        
        // Показываем первое изображение
        this.updateLightboxImage(images, startIndex, img, counter, thumbs);
    }
    
    private closeLightbox() {
        if (this.activeLightbox) {
            document.body.removeChild(this.activeLightbox);
            this.activeLightbox = null;
            document.body.style.overflow = '';
        }
    }
    
    private createButton(text: string, className: string): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = className;
        btn.innerHTML = text;
        return btn;
    }
    
    private updateLightboxImage(
        images: Array<{src: string, alt: string}>, 
        index: number, 
        img: HTMLImageElement, 
        counter: HTMLElement,
        thumbs: HTMLImageElement[]
    ) {
        img.src = images[index].src;
        img.alt = images[index].alt;
        
        // Сбрасываем трансформации при смене изображения
        this.resetZoomAndPosition();
        img.style.transform = 'translate(0px, 0px) scale(1)';
        
        // Обновляем счетчик
        counter.textContent = `${index + 1} / ${images.length}`;
        
        // Обновляем активную миниатюру
        thumbs.forEach((thumb, i) => {
            thumb.classList.toggle('active', i === index);
        });
    }
    
    private resetZoomAndPosition() {
        this.zoomLevel = 1;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
    }
    
    private setupIndividualImages() {
        // Обработчик для отдельных изображений в заметке
        this.registerDomEvent(document, 'click', (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            
            // Пропускаем клики на элементах лайтбокса
            if (target.closest('.lg-backdrop') || 
                target.closest('.lg-btn') || 
                target.closest('.lg-thumbnail') ||
                target.closest('.lg-zoom-controls')) {
                return;
            }
            
            // Пропускаем клики на изображениях в галерее
            if (target.closest('.gallery-item')) {
                return;
            }
            
            // Ищем изображение, на которое кликнули
            let imgElement: HTMLImageElement | null = null;
            
            if (target.tagName === 'IMG') {
                imgElement = target as HTMLImageElement;
            } else if (target.classList.contains('internal-embed')) {
                // Для внутренних embed изображений Obsidian
                imgElement = target.querySelector('img');
            }
            
            if (!imgElement) {
                return;
            }
            
            // Проверяем, что это изображение из заметки (не часть интерфейса Obsidian)
            const isNoteImage = imgElement.closest('.markdown-source-view, .markdown-preview-view');
            if (!isNoteImage) {
                return;
            }
            
            // Получаем src и alt
            const src = imgElement.getAttribute('src');
            const alt = imgElement.getAttribute('alt') || '';
            
            // Проверяем, что src существует и не является data-URI
            if (src && !src.startsWith('data:') && !src.includes('http://') && !src.includes('https://')) {
                // Открываем лайтбокс с одним изображением
                e.preventDefault();
                e.stopPropagation();
                this.openLightbox([{ src, alt }], 0);
            }
        });
        
        // Также обрабатываем изображения в Markdown preview
        this.registerMarkdownPostProcessor((element) => {
            const images = element.querySelectorAll('img:not(.gallery-item img)');
            
            images.forEach((img) => {
                // Добавляем курсор указателя для индикации
                img.style.cursor = 'zoom-in';
                
                // Добавляем обработчик клика
                img.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const src = img.getAttribute('src');
                    const alt = img.getAttribute('alt') || '';
                    
                    if (src && !src.startsWith('data:')) {
                        this.openLightbox([{ src, alt }], 0);
                    }
                });
            });
        });
    }
    
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
        this.updateDynamicStyles();
        
        // Перерегистрируем обработчик с новым ключевым словом
        this.app.workspace.off('file-open', () => {});
        this.registerMarkdownCodeBlockProcessor(this.settings.galleryKeyword, async (source, el, ctx) => {
            await this.renderGallery(source, el, ctx);
        });
        
        this.refreshAllGalleries();
    }
    
    refreshAllGalleries() {
        const galleryContainers = document.querySelectorAll('.gallery-container');
        galleryContainers.forEach(container => {
            const grid = container.querySelector('.gallery-grid');
            if (grid) {
                const items = grid.querySelectorAll('.gallery-item');
                grid.style.setProperty('--image-count', items.length.toString());
            }
        });
    }
    
    onunload() {
        console.log('Unloading Image Gallery plugin');
        
        // Удаляем стили
        const staticStyleEl = document.getElementById('obsidian-gallery-static-styles');
        if (staticStyleEl) {
            staticStyleEl.remove();
        }
        
        if (this.styleEl) {
            this.styleEl.remove();
        }
        
        this.closeLightbox();
    }
}

class GallerySettingTab extends PluginSettingTab {
    plugin: ImageGalleryPlugin;
    
    constructor(app: App, plugin: ImageGalleryPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        containerEl.createEl('h1', { text: 'Nice Gallery Settings' });
        
        const manifest = (this.plugin as any).manifest;
        if (manifest && manifest.version) {
            containerEl.createEl('p', { 
                text: `'Vibe coding by @Konfetigr. Version: ${manifest.version}`,
                cls: 'gallery-version-info'
            });
        }
        
        new Setting(containerEl)
            .setName('Gallery keyword. | Ключевое слово для объявления галлереи')
            .setDesc('Keyword for the code block (e.g., "gallery", "images", "photos").')
            .addText(text => text
                .setPlaceholder('gallery')
                .setValue(this.plugin.settings.galleryKeyword)
                .onChange(async (value) => {
                    this.plugin.settings.galleryKeyword = value;
                    await this.plugin.saveSettings();
                }));
        
        containerEl.createEl('h2', { text: 'Maximum columns on: | Сколько фоток вместится в строку:' });
        new Setting(containerEl)
            .setName('Desktop')
            .setDesc('Maximum number of columns on large screens (≥1024px). Actual columns will adjust based on image count.')
            .addSlider(slider => slider
                .setLimits(1, 8, 1)
                .setValue(this.plugin.settings.maxColumnsDesktop)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxColumnsDesktop = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Tablet')
            .setDesc('Maximum number of columns on medium screens (768px-1023px)')
            .addSlider(slider => slider
                .setLimits(1, 6, 1)
                .setValue(this.plugin.settings.maxColumnsTablet)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxColumnsTablet = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Mobile')
            .setDesc('Maximum number of columns on small screens (<768px)')
            .addSlider(slider => slider
                .setLimits(1, 4, 1)
                .setValue(this.plugin.settings.maxColumnsMobile)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.maxColumnsMobile = value;
                    await this.plugin.saveSettings();
                }));
        
        new Setting(containerEl)
            .setName('Gap between images | Расстояние между фотками')
            .setDesc('Space between thumbnails (e.g., 12px, 1rem)')
            .addText(text => text
                .setPlaceholder('12px')
                .setValue(this.plugin.settings.gapSize)
                .onChange(async (value) => {
                    this.plugin.settings.gapSize = value;
                    await this.plugin.saveSettings();
                }));
        
        // Add documentation section
        containerEl.createEl('h3', { text: 'Documentation / Документация' });
        
        const docContainer = containerEl.createDiv({ cls: 'gallery-doc-container' });
        
        // English documentation
        const enDoc = docContainer.createDiv({ cls: 'gallery-doc-section' });
        enDoc.createEl('h4', { text: '📖 How to use the Gallery Plugin' });
        
        enDoc.createEl('p', { text: 'The plugin provides two ways to view images:' });
        
        const enList = enDoc.createEl('ul');
        enList.createEl('li').innerHTML = '<strong>Individual images:</strong> Click on any image in your note to open it in a lightbox viewer with zoom and pan functionality.';
        enList.createEl('li').innerHTML = '<strong>Image galleries:</strong> Create galleries using code blocks with your chosen keyword.';
        
        enDoc.createEl('p', { text: 'To create a gallery, use a code block with your gallery keyword:' });
        
        const enExample = enDoc.createEl('pre');
        enExample.style.cssText = 'background: var(--background-secondary); padding: 10px; border-radius: 5px; overflow-x: auto;';
        enExample.createEl('code').innerText = `\`\`\`gallery
![[image1.jpg]]
![[image2.png|Optional caption]]
![[photo3.jpg]]
![[screenshot.png|Another image with caption]]
\`\`\``;
        
        enDoc.createEl('p', { text: 'Gallery features:' });
        const enFeatures = enDoc.createEl('ul');
        enFeatures.createEl('li').innerText = 'Click on any thumbnail to open the lightbox';
        enFeatures.createEl('li').innerText = 'Navigate between images with arrow keys or swipe';
        enFeatures.createEl('li').innerText = 'Zoom with mouse wheel, pinch gesture';
        enFeatures.createEl('li').innerText = 'Pan by dragging when zoomed in';
        enFeatures.createEl('li').innerText = 'Double-click/tap to reset zoom';
        enFeatures.createEl('li').innerText = 'Press Escape to close the lightbox';
        enFeatures.createEl('li').innerText = 'If the photo is zoomed in, the lightbox will not close by clicking on the image. Double-tap to reset the zoom';
        
        // Russian documentation
        const ruDoc = docContainer.createDiv({ cls: 'gallery-doc-section' });
        ruDoc.createEl('h4', { text: '📖 Как использовать плагин Галерея' });
        
        ruDoc.createEl('p', { text: 'Плагин предоставляет два способа просмотра изображений:' });
        
        const ruList = ruDoc.createEl('ul');
        ruList.createEl('li').innerHTML = '<strong>Отдельные изображения:</strong> Кликните на любое изображение в заметке, чтобы открыть его в лайтбоксе с возможностью увеличения и перемещения.';
        ruList.createEl('li').innerHTML = '<strong>Галереи изображений:</strong> Создавайте галереи с помощью блоков кода с выбранным ключевым словом.';
        
        ruDoc.createEl('p', { text: 'Чтобы создать галерею, используйте блок кода с вашим ключевым словом:' });
        
        const ruExample = ruDoc.createEl('pre');
        ruExample.style.cssText = 'background: var(--background-secondary); padding: 10px; border-radius: 5px; overflow-x: auto;';
        ruExample.createEl('code').innerText = `\`\`\`gallery
![[изображение1.jpg]]
![[изображение2.png|Необязательная подпись]]
![[фото3.jpg]]
![[скриншот.png|Еще одно изображение с подписью]]
\`\`\``;
        
        ruDoc.createEl('p', { text: 'Возможности галереи:' });
        const ruFeatures = ruDoc.createEl('ul');
        ruFeatures.createEl('li').innerText = 'Кликните на любую миниатюру для открытия лайтбокса';
        ruFeatures.createEl('li').innerText = 'Перемещайтесь между изображениями с помощью клавиш-стрелок или свайпа';
        ruFeatures.createEl('li').innerText = 'Увеличивайте с помощью колесика мыши, жеста pinch';
        ruFeatures.createEl('li').innerText = 'Перемещайте увеличенное изображение перетаскиванием';
        ruFeatures.createEl('li').innerText = 'Двойной клик/тап сбрасывает масштаб';
        ruFeatures.createEl('li').innerText = 'Нажмите Escape для закрытия лайтбокса или на оригинальном масштабе нажатием на фото';
        ruFeatures.createEl('li').innerText = 'Если масштаб фото увеличен лайтбокс не закроется нажатием на картинку. Сбросьте масштаб двойным нажатием';
        
        // Add some styling for the documentation
        const style = document.createElement('style');
        style.textContent = `
            .gallery-doc-section {
                margin-top: 20px;
                padding: 15px;
                background: var(--background-primary);
                border-radius: 8px;
                border: 1px solid var(--background-modifier-border);
            }
            
            .gallery-doc-section h4 {
                margin-top: 0;
                border-bottom: 1px solid var(--background-modifier-border);
                padding-bottom: 8px;
            }
            
            .gallery-doc-section ul {
                padding-left: 20px;
            }
            
            .gallery-doc-section li {
                margin-bottom: 5px;
            }
            
            .gallery-doc-section pre {
                margin: 10px 0;
            }
            
            .gallery-doc-section code {
                font-family: 'Fira Code', 'Cascadia Code', monospace;
                font-size: 14px;
            }
            
            .gallery-doc-section + .gallery-doc-section {
                margin-top: 30px;
                border-top: 2px solid var(--background-modifier-border);
            }
        `;
        containerEl.appendChild(style);
    }
}