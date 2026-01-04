var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ImageGalleryPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  maxColumnsDesktop: 4,
  maxColumnsTablet: 3,
  maxColumnsMobile: 2,
  gapSize: "12px",
  galleryKeyword: "gallery"
};
var ImageGalleryPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.zoomLevel = 1;
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.activeLightbox = null;
    this.keyHandler = null;
    // <-- Добавьте это
    // Для обработки свайпов
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.isSwiping = false;
  }
  async onload() {
    console.log("Loading Image Gallery plugin");
    await this.loadSettings();
    this.loadStyles();
    this.addDynamicStyles();
    this.registerMarkdownCodeBlockProcessor(this.settings.galleryKeyword, async (source, el, ctx) => {
      await this.renderGallery(source, el, ctx);
    });
    this.setupIndividualImages();
    this.addSettingTab(new GallerySettingTab(this.app, this));
  }
  loadStyles() {
    const staticStyleEl = document.createElement("style");
    staticStyleEl.id = "obsidian-gallery-static-styles";
    document.head.appendChild(staticStyleEl);
  }
  addDynamicStyles() {
    if (this.styleEl) {
      this.styleEl.remove();
    }
    this.styleEl = document.createElement("style");
    this.styleEl.id = "obsidian-gallery-dynamic-styles";
    this.updateDynamicStyles();
    document.head.appendChild(this.styleEl);
  }
  updateDynamicStyles() {
    const dynamicCss = `
            .gallery-grid {
                gap: ${this.settings.gapSize};
            }
            
            /* \u0410\u0434\u0430\u043F\u0442\u0438\u0432\u043D\u0430\u044F \u0441\u0435\u0442\u043A\u0430 \u0441 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0435\u043C \u043C\u0430\u043A\u0441\u0438\u043C\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043A\u043E\u043B\u0438\u0447\u0435\u0441\u0442\u0432\u0430 \u043A\u043E\u043B\u043E\u043D\u043E\u043A */
            /* \u0414\u0435\u0441\u043A\u0442\u043E\u043F */
            @media (min-width: 1024px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsDesktop}, var(--image-count, ${this.settings.maxColumnsDesktop})) - 20px), 1fr));
                }
            }
            
            /* \u041F\u043B\u0430\u043D\u0448\u0435\u0442 */
            @media (min-width: 768px) and (max-width: 1023px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsTablet}, var(--image-count, ${this.settings.maxColumnsTablet})) - 20px), 1fr));
                }
            }
            
            /* \u041C\u043E\u0431\u0438\u043B\u044C\u043D\u044B\u0439 */
            @media (max-width: 767px) {
                .gallery-grid {
                    grid-template-columns: repeat(auto-fill, minmax(calc(100% / min(${this.settings.maxColumnsMobile}, var(--image-count, ${this.settings.maxColumnsMobile})) - 20px), 1fr));
                }
            }
            
            /* \u0421\u0442\u0438\u043B\u044C \u0434\u043B\u044F \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0445 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439 */
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
  async renderGallery(source, el, ctx) {
    el.empty();
    const galleryContainer = el.createDiv({ cls: "gallery-container" });
    const imageRegex = /!\[\[(.*?\.(?:jpg|jpeg|png|gif|bmp|svg|webp|tiff|avif))(?:\|.*?)?\]\]/gi;
    const imageMatches = source.match(imageRegex) || [];
    if (imageMatches.length === 0) {
      galleryContainer.setText("No images found in gallery block.");
      return;
    }
    const grid = galleryContainer.createDiv({ cls: "gallery-grid" });
    grid.style.setProperty("--image-count", imageMatches.length.toString());
    const images = [];
    for (const match of imageMatches) {
      const fullMatch = match.match(/!\[\[(.*?)(?:\|(.*?))?\]\]/);
      if (!fullMatch)
        continue;
      const filename = fullMatch[1];
      const altText = fullMatch[2] || filename.split("/").pop() || filename;
      try {
        const file = this.app.metadataCache.getFirstLinkpathDest(filename, ctx.sourcePath);
        if (!file)
          continue;
        const resourcePath = this.app.vault.getResourcePath(file);
        const imgContainer = grid.createDiv({ cls: "gallery-item" });
        imgContainer.setAttribute("data-src", resourcePath);
        imgContainer.setAttribute("data-alt", altText);
        imgContainer.setAttribute("data-index", images.length.toString());
        const img = imgContainer.createEl("img", {
          attr: {
            src: resourcePath,
            alt: altText,
            loading: "lazy"
          }
        });
        imgContainer.addEventListener("click", (e) => {
          if (e.button === 0) {
            e.preventDefault();
            e.stopPropagation();
            const galleryImages = Array.from(grid.querySelectorAll(".gallery-item")).map((item) => ({
              src: item.getAttribute("data-src") || "",
              alt: item.getAttribute("data-alt") || ""
            }));
            const index = parseInt(imgContainer.getAttribute("data-index") || "0");
            this.openLightbox(galleryImages, index);
          }
        });
        images.push({
          src: resourcePath,
          alt: altText
        });
      } catch (error) {
        console.error("Error loading image:", error);
      }
    }
  }
  openLightbox(images, startIndex) {
    if (this.activeLightbox) {
      this.closeLightbox();
    }
    const backdrop = document.createElement("div");
    backdrop.className = "lg-backdrop";
    this.activeLightbox = backdrop;
    const imageContainer = document.createElement("div");
    imageContainer.className = "lg-image-container";
    const img = document.createElement("img");
    img.className = "lg-image";
    const prevBtn = this.createButton("\u2190", "lg-btn lg-prev");
    const nextBtn = this.createButton("\u2192", "lg-btn lg-next");
    const counter = document.createElement("div");
    counter.className = "lg-counter";
    let thumbnailsContainer = null;
    const thumbs = [];
    if (images.length > 1) {
      thumbnailsContainer = document.createElement("div");
      thumbnailsContainer.className = "lg-thumbnails";
      images.forEach((image, index) => {
        const thumb = document.createElement("img");
        thumb.className = "lg-thumbnail";
        thumb.src = image.src;
        thumb.setAttribute("data-index", index.toString());
        thumb.alt = image.alt;
        thumb.addEventListener("click", (e) => {
          e.stopPropagation();
          this.updateLightboxImage(images, index, img, counter, thumbs);
          currentIndex = index;
          this.resetZoomAndPosition();
        });
        thumbnailsContainer.appendChild(thumb);
        thumbs.push(thumb);
      });
    }
    backdrop.appendChild(imageContainer);
    imageContainer.appendChild(img);
    if (images.length > 1) {
      backdrop.appendChild(prevBtn);
      backdrop.appendChild(nextBtn);
      backdrop.appendChild(thumbnailsContainer);
    } else {
      counter.style.display = "none";
    }
    backdrop.appendChild(counter);
    document.body.appendChild(backdrop);
    document.body.style.overflow = "hidden";
    let currentIndex = startIndex;
    this.zoomLevel = 1;
    this.isDragging = false;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
    this.isSwiping = false;
    const updateImage = () => {
      img.src = images[currentIndex].src;
      img.alt = images[currentIndex].alt;
      img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
      counter.textContent = `${currentIndex + 1} / ${images.length}`;
      thumbs.forEach((thumb, index) => {
        thumb.classList.toggle("active", index === currentIndex);
      });
      if (thumbs[currentIndex]) {
        thumbs[currentIndex].scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center"
        });
      }
    };
    const switchImage = (direction) => {
      if (images.length > 1) {
        if (direction === "next") {
          currentIndex = (currentIndex + 1) % images.length;
        } else {
          currentIndex = (currentIndex - 1 + images.length) % images.length;
        }
        this.resetZoomAndPosition();
        updateImage();
      }
    };
    const closeLightbox = () => {
      this.closeLightbox();
    };
    if (images.length > 1) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        switchImage("prev");
      });
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        switchImage("next");
      });
    }
    let lastTapTime = 0;
    const handleDoubleTap = (e) => {
      e.preventDefault();
      e.stopPropagation();
      img.classList.add("zooming");
      this.resetZoomAndPosition();
      img.style.transform = "translate(0px, 0px) scale(1)";
      setTimeout(() => {
        img.classList.remove("zooming");
      }, 300);
    };
    imageContainer.addEventListener("dblclick", handleDoubleTap);
    imageContainer.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        const currentTime = (/* @__PURE__ */ new Date()).getTime();
        const tapLength = currentTime - lastTapTime;
        if (tapLength < 300 && tapLength > 0) {
          handleDoubleTap(e);
        }
        lastTapTime = currentTime;
      }
    });
    imageContainer.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomLevel = Math.max(0.5, Math.min(this.zoomLevel * delta, 5));
      img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
    }, { passive: false });
    const startDrag = (clientX, clientY) => {
      if (this.zoomLevel > 1) {
        this.isDragging = true;
        imageContainer.classList.add("dragging");
        this.dragStartX = clientX - this.dragOffsetX;
        this.dragStartY = clientY - this.dragOffsetY;
      }
    };
    const doDrag = (clientX, clientY) => {
      if (this.isDragging) {
        this.dragOffsetX = clientX - this.dragStartX;
        this.dragOffsetY = clientY - this.dragStartY;
        img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
      }
    };
    const endDrag = () => {
      this.isDragging = false;
      imageContainer.classList.remove("dragging");
    };
    imageContainer.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        startDrag(e.clientX, e.clientY);
      }
    });
    document.addEventListener("mousemove", (e) => {
      doDrag(e.clientX, e.clientY);
    });
    document.addEventListener("mouseup", endDrag);
    let initialDistance = null;
    let initialTouches = null;
    let isPinching = false;
    imageContainer.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        isPinching = true;
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialTouches = e.touches;
        e.preventDefault();
      } else if (e.touches.length === 1 && this.zoomLevel > 1) {
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 1) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.touchStartTime = Date.now();
        this.isSwiping = false;
      }
    });
    imageContainer.addEventListener("touchmove", (e) => {
      if (e.touches.length === 2 && initialDistance !== null && initialTouches && isPinching) {
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
        doDrag(e.touches[0].clientX, e.touches[0].clientY);
      } else if (e.touches.length === 1 && this.zoomLevel === 1) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - this.touchStartX;
        const deltaY = touch.clientY - this.touchStartY;
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
          this.isSwiping = true;
          img.style.transform = `translate(${deltaX * 0.5}px, 0px) scale(1)`;
          e.preventDefault();
        }
      }
    });
    imageContainer.addEventListener("touchend", (e) => {
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
        const minSwipeDistance = 50;
        const maxSwipeTime = 300;
        if (this.isSwiping && Math.abs(deltaX) > minSwipeDistance && deltaTime < maxSwipeTime) {
          if (deltaX > 0) {
            switchImage("prev");
          } else {
            switchImage("next");
          }
          e.preventDefault();
        }
        img.style.transform = "translate(0px, 0px) scale(1)";
      }
      this.isSwiping = false;
    });
    this.keyHandler = (e) => {
      if (e.key === "Escape") {
        closeLightbox();
      } else if (images.length > 1) {
        if (e.key === "ArrowLeft") {
          switchImage("prev");
        } else if (e.key === "ArrowRight") {
          switchImage("next");
        }
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        this.zoomLevel = Math.min(this.zoomLevel * 1.2, 5);
        img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        this.zoomLevel = Math.max(this.zoomLevel / 1.2, 0.5);
        img.style.transform = `translate(${this.dragOffsetX}px, ${this.dragOffsetY}px) scale(${this.zoomLevel})`;
      } else if (e.key === "0") {
        e.preventDefault();
        this.resetZoomAndPosition();
        img.style.transform = `translate(0px, 0px) scale(1)`;
      }
    };
    document.addEventListener("keydown", this.keyHandler);
    backdrop.addEventListener("click", (e) => {
      const target = e.target;
      if (target === backdrop || target === imageContainer && this.zoomLevel === 1 || target === img && this.zoomLevel === 1) {
        closeLightbox();
      }
    });
    setTimeout(() => backdrop.classList.add("in"), 10);
    this.updateLightboxImage(images, startIndex, img, counter, thumbs);
  }
  closeLightbox() {
    if (this.activeLightbox) {
      if (this.keyHandler) {
        document.removeEventListener("keydown", this.keyHandler);
        this.keyHandler = null;
      }
      document.body.removeChild(this.activeLightbox);
      this.activeLightbox = null;
      document.body.style.overflow = "";
    }
  }
  createButton(text, className) {
    const btn = document.createElement("button");
    btn.className = className;
    btn.innerHTML = text;
    return btn;
  }
  updateLightboxImage(images, index, img, counter, thumbs) {
    img.src = images[index].src;
    img.alt = images[index].alt;
    this.resetZoomAndPosition();
    img.style.transform = "translate(0px, 0px) scale(1)";
    counter.textContent = `${index + 1} / ${images.length}`;
    thumbs.forEach((thumb, i) => {
      thumb.classList.toggle("active", i === index);
    });
  }
  resetZoomAndPosition() {
    this.zoomLevel = 1;
    this.dragOffsetX = 0;
    this.dragOffsetY = 0;
  }
  setupIndividualImages() {
    this.registerDomEvent(document, "click", (e) => {
      const target = e.target;
      if (target.closest(".lg-backdrop") || target.closest(".lg-btn") || target.closest(".lg-thumbnail") || target.closest(".lg-zoom-controls")) {
        return;
      }
      if (target.closest(".gallery-item")) {
        return;
      }
      let imgElement = null;
      if (target.tagName === "IMG") {
        imgElement = target;
      } else if (target.classList.contains("internal-embed")) {
        imgElement = target.querySelector("img");
      }
      if (!imgElement) {
        return;
      }
      const isNoteImage = imgElement.closest(".markdown-source-view, .markdown-preview-view");
      if (!isNoteImage) {
        return;
      }
      const src = imgElement.getAttribute("src");
      const alt = imgElement.getAttribute("alt") || "";
      if (src && !src.startsWith("data:") && !src.includes("http://") && !src.includes("https://")) {
        e.preventDefault();
        e.stopPropagation();
        this.openLightbox([{ src, alt }], 0);
      }
    });
    this.registerMarkdownPostProcessor((element) => {
      const images = element.querySelectorAll("img:not(.gallery-item img)");
      images.forEach((img) => {
        img.style.cursor = "zoom-in";
        img.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const src = img.getAttribute("src");
          const alt = img.getAttribute("alt") || "";
          if (src && !src.startsWith("data:")) {
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
    this.app.workspace.off("file-open", () => {
    });
    this.registerMarkdownCodeBlockProcessor(this.settings.galleryKeyword, async (source, el, ctx) => {
      await this.renderGallery(source, el, ctx);
    });
    this.refreshAllGalleries();
  }
  refreshAllGalleries() {
    const galleryContainers = document.querySelectorAll(".gallery-container");
    galleryContainers.forEach((container) => {
      const grid = container.querySelector(".gallery-grid");
      if (grid) {
        const items = grid.querySelectorAll(".gallery-item");
        grid.style.setProperty("--image-count", items.length.toString());
      }
    });
  }
  onunload() {
    console.log("Unloading Image Gallery plugin");
    const staticStyleEl = document.getElementById("obsidian-gallery-static-styles");
    if (staticStyleEl) {
      staticStyleEl.remove();
    }
    if (this.styleEl) {
      this.styleEl.remove();
    }
    this.closeLightbox();
  }
};
var GallerySettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h1", { text: "Nice Gallery Settings" });
    const manifest = this.plugin.manifest;
    if (manifest && manifest.version) {
      containerEl.createEl("p", {
        text: `'Vibe coding by @Konfetigr. Version: ${manifest.version}`,
        cls: "gallery-version-info"
      });
    }
    new import_obsidian.Setting(containerEl).setName("Gallery keyword. | \u041A\u043B\u044E\u0447\u0435\u0432\u043E\u0435 \u0441\u043B\u043E\u0432\u043E \u0434\u043B\u044F \u043E\u0431\u044A\u044F\u0432\u043B\u0435\u043D\u0438\u044F \u0433\u0430\u043B\u043B\u0435\u0440\u0435\u0438").setDesc('Keyword for the code block (e.g., "gallery", "images", "photos").').addText((text) => text.setPlaceholder("gallery").setValue(this.plugin.settings.galleryKeyword).onChange(async (value) => {
      this.plugin.settings.galleryKeyword = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h2", { text: "Maximum columns on: | \u0421\u043A\u043E\u043B\u044C\u043A\u043E \u0444\u043E\u0442\u043E\u043A \u0432\u043C\u0435\u0441\u0442\u0438\u0442\u0441\u044F \u0432 \u0441\u0442\u0440\u043E\u043A\u0443:" });
    new import_obsidian.Setting(containerEl).setName("Desktop").setDesc("Maximum number of columns on large screens (\u22651024px). Actual columns will adjust based on image count.").addSlider((slider) => slider.setLimits(1, 8, 1).setValue(this.plugin.settings.maxColumnsDesktop).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxColumnsDesktop = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Tablet").setDesc("Maximum number of columns on medium screens (768px-1023px)").addSlider((slider) => slider.setLimits(1, 6, 1).setValue(this.plugin.settings.maxColumnsTablet).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxColumnsTablet = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Mobile").setDesc("Maximum number of columns on small screens (<768px)").addSlider((slider) => slider.setLimits(1, 4, 1).setValue(this.plugin.settings.maxColumnsMobile).setDynamicTooltip().onChange(async (value) => {
      this.plugin.settings.maxColumnsMobile = value;
      await this.plugin.saveSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("Gap between images | \u0420\u0430\u0441\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043C\u0435\u0436\u0434\u0443 \u0444\u043E\u0442\u043A\u0430\u043C\u0438").setDesc("Space between thumbnails (e.g., 12px, 1rem)").addText((text) => text.setPlaceholder("12px").setValue(this.plugin.settings.gapSize).onChange(async (value) => {
      this.plugin.settings.gapSize = value;
      await this.plugin.saveSettings();
    }));
    containerEl.createEl("h3", { text: "Documentation / \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u0430\u0446\u0438\u044F" });
    const docContainer = containerEl.createDiv({ cls: "gallery-doc-container" });
    const enDoc = docContainer.createDiv({ cls: "gallery-doc-section" });
    enDoc.createEl("h4", { text: "\u{1F4D6} How to use the Gallery Plugin" });
    enDoc.createEl("p", { text: "The plugin provides two ways to view images:" });
    const enList = enDoc.createEl("ul");
    enList.createEl("li").innerHTML = "<strong>Individual images:</strong> Click on any image in your note to open it in a lightbox viewer with zoom and pan functionality.";
    enList.createEl("li").innerHTML = "<strong>Image galleries:</strong> Create galleries using code blocks with your chosen keyword.";
    enDoc.createEl("p", { text: "To create a gallery, use a code block with your gallery keyword:" });
    const enExample = enDoc.createEl("pre");
    enExample.style.cssText = "background: var(--background-secondary); padding: 10px; border-radius: 5px; overflow-x: auto;";
    enExample.createEl("code").innerText = `\`\`\`gallery
![[image1.jpg]]
![[image2.png|Optional caption]]
![[photo3.jpg]]
![[screenshot.png|Another image with caption]]
\`\`\``;
    enDoc.createEl("p", { text: "Gallery features:" });
    const enFeatures = enDoc.createEl("ul");
    enFeatures.createEl("li").innerText = "Click on any thumbnail to open the lightbox";
    enFeatures.createEl("li").innerText = "Navigate between images with arrow keys or swipe";
    enFeatures.createEl("li").innerText = "Zoom with mouse wheel, pinch gesture";
    enFeatures.createEl("li").innerText = "Pan by dragging when zoomed in";
    enFeatures.createEl("li").innerText = "Double-click/tap to reset zoom";
    enFeatures.createEl("li").innerText = "Press Escape to close the lightbox";
    enFeatures.createEl("li").innerText = "If the photo is zoomed in, the lightbox will not close by clicking on the image. Double-tap to reset the zoom";
    const ruDoc = docContainer.createDiv({ cls: "gallery-doc-section" });
    ruDoc.createEl("h4", { text: "\u{1F4D6} \u041A\u0430\u043A \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u0442\u044C \u043F\u043B\u0430\u0433\u0438\u043D \u0413\u0430\u043B\u0435\u0440\u0435\u044F" });
    ruDoc.createEl("p", { text: "\u041F\u043B\u0430\u0433\u0438\u043D \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442 \u0434\u0432\u0430 \u0441\u043F\u043E\u0441\u043E\u0431\u0430 \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439:" });
    const ruList = ruDoc.createEl("ul");
    ruList.createEl("li").innerHTML = "<strong>\u041E\u0442\u0434\u0435\u043B\u044C\u043D\u044B\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F:</strong> \u041A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u043D\u0430 \u043B\u044E\u0431\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0432 \u0437\u0430\u043C\u0435\u0442\u043A\u0435, \u0447\u0442\u043E\u0431\u044B \u043E\u0442\u043A\u0440\u044B\u0442\u044C \u0435\u0433\u043E \u0432 \u043B\u0430\u0439\u0442\u0431\u043E\u043A\u0441\u0435 \u0441 \u0432\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u044C\u044E \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u0438\u044F \u0438 \u043F\u0435\u0440\u0435\u043C\u0435\u0449\u0435\u043D\u0438\u044F.";
    ruList.createEl("li").innerHTML = "<strong>\u0413\u0430\u043B\u0435\u0440\u0435\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439:</strong> \u0421\u043E\u0437\u0434\u0430\u0432\u0430\u0439\u0442\u0435 \u0433\u0430\u043B\u0435\u0440\u0435\u0438 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u0431\u043B\u043E\u043A\u043E\u0432 \u043A\u043E\u0434\u0430 \u0441 \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u043E\u043C.";
    ruDoc.createEl("p", { text: "\u0427\u0442\u043E\u0431\u044B \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u0433\u0430\u043B\u0435\u0440\u0435\u044E, \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u0431\u043B\u043E\u043A \u043A\u043E\u0434\u0430 \u0441 \u0432\u0430\u0448\u0438\u043C \u043A\u043B\u044E\u0447\u0435\u0432\u044B\u043C \u0441\u043B\u043E\u0432\u043E\u043C:" });
    const ruExample = ruDoc.createEl("pre");
    ruExample.style.cssText = "background: var(--background-secondary); padding: 10px; border-radius: 5px; overflow-x: auto;";
    ruExample.createEl("code").innerText = `\`\`\`gallery
![[\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u04351.jpg]]
![[\u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u04352.png|\u041D\u0435\u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u0430\u044F \u043F\u043E\u0434\u043F\u0438\u0441\u044C]]
![[\u0444\u043E\u0442\u043E3.jpg]]
![[\u0441\u043A\u0440\u0438\u043D\u0448\u043E\u0442.png|\u0415\u0449\u0435 \u043E\u0434\u043D\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u0441 \u043F\u043E\u0434\u043F\u0438\u0441\u044C\u044E]]
\`\`\``;
    ruDoc.createEl("p", { text: "\u0412\u043E\u0437\u043C\u043E\u0436\u043D\u043E\u0441\u0442\u0438 \u0433\u0430\u043B\u0435\u0440\u0435\u0438:" });
    const ruFeatures = ruDoc.createEl("ul");
    ruFeatures.createEl("li").innerText = "\u041A\u043B\u0438\u043A\u043D\u0438\u0442\u0435 \u043D\u0430 \u043B\u044E\u0431\u0443\u044E \u043C\u0438\u043D\u0438\u0430\u0442\u044E\u0440\u0443 \u0434\u043B\u044F \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u044F \u043B\u0430\u0439\u0442\u0431\u043E\u043A\u0441\u0430";
    ruFeatures.createEl("li").innerText = "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0439\u0442\u0435\u0441\u044C \u043C\u0435\u0436\u0434\u0443 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F\u043C\u0438 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043A\u043B\u0430\u0432\u0438\u0448-\u0441\u0442\u0440\u0435\u043B\u043E\u043A \u0438\u043B\u0438 \u0441\u0432\u0430\u0439\u043F\u0430";
    ruFeatures.createEl("li").innerText = "\u0423\u0432\u0435\u043B\u0438\u0447\u0438\u0432\u0430\u0439\u0442\u0435 \u0441 \u043F\u043E\u043C\u043E\u0449\u044C\u044E \u043A\u043E\u043B\u0435\u0441\u0438\u043A\u0430 \u043C\u044B\u0448\u0438, \u0436\u0435\u0441\u0442\u0430 pinch";
    ruFeatures.createEl("li").innerText = "\u041F\u0435\u0440\u0435\u043C\u0435\u0449\u0430\u0439\u0442\u0435 \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 \u043F\u0435\u0440\u0435\u0442\u0430\u0441\u043A\u0438\u0432\u0430\u043D\u0438\u0435\u043C";
    ruFeatures.createEl("li").innerText = "\u0414\u0432\u043E\u0439\u043D\u043E\u0439 \u043A\u043B\u0438\u043A/\u0442\u0430\u043F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442 \u043C\u0430\u0441\u0448\u0442\u0430\u0431";
    ruFeatures.createEl("li").innerText = "\u041D\u0430\u0436\u043C\u0438\u0442\u0435 Escape \u0434\u043B\u044F \u0437\u0430\u043A\u0440\u044B\u0442\u0438\u044F \u043B\u0430\u0439\u0442\u0431\u043E\u043A\u0441\u0430 \u0438\u043B\u0438 \u043D\u0430 \u043E\u0440\u0438\u0433\u0438\u043D\u0430\u043B\u044C\u043D\u043E\u043C \u043C\u0430\u0441\u0448\u0442\u0430\u0431\u0435 \u043D\u0430\u0436\u0430\u0442\u0438\u0435\u043C \u043D\u0430 \u0444\u043E\u0442\u043E";
    ruFeatures.createEl("li").innerText = "\u0415\u0441\u043B\u0438 \u043C\u0430\u0441\u0448\u0442\u0430\u0431 \u0444\u043E\u0442\u043E \u0443\u0432\u0435\u043B\u0438\u0447\u0435\u043D \u043B\u0430\u0439\u0442\u0431\u043E\u043A\u0441 \u043D\u0435 \u0437\u0430\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043D\u0430\u0436\u0430\u0442\u0438\u0435\u043C \u043D\u0430 \u043A\u0430\u0440\u0442\u0438\u043D\u043A\u0443. \u0421\u0431\u0440\u043E\u0441\u044C\u0442\u0435 \u043C\u0430\u0441\u0448\u0442\u0430\u0431 \u0434\u0432\u043E\u0439\u043D\u044B\u043C \u043D\u0430\u0436\u0430\u0442\u0438\u0435\u043C";
    const style = document.createElement("style");
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
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQgfSBmcm9tICdvYnNpZGlhbic7XHJcblxyXG5pbnRlcmZhY2UgR2FsbGVyeVNldHRpbmdzIHtcclxuICAgIG1heENvbHVtbnNEZXNrdG9wOiBudW1iZXI7XHJcbiAgICBtYXhDb2x1bW5zVGFibGV0OiBudW1iZXI7XHJcbiAgICBtYXhDb2x1bW5zTW9iaWxlOiBudW1iZXI7XHJcbiAgICBnYXBTaXplOiBzdHJpbmc7XHJcbiAgICBnYWxsZXJ5S2V5d29yZDogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBHYWxsZXJ5U2V0dGluZ3MgPSB7XHJcbiAgICBtYXhDb2x1bW5zRGVza3RvcDogNCxcclxuICAgIG1heENvbHVtbnNUYWJsZXQ6IDMsXHJcbiAgICBtYXhDb2x1bW5zTW9iaWxlOiAyLFxyXG4gICAgZ2FwU2l6ZTogJzEycHgnLFxyXG4gICAgZ2FsbGVyeUtleXdvcmQ6ICdnYWxsZXJ5J1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1hZ2VHYWxsZXJ5UGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuICAgIHNldHRpbmdzOiBHYWxsZXJ5U2V0dGluZ3M7XHJcbiAgICBwcml2YXRlIHpvb21MZXZlbDogbnVtYmVyID0gMTtcclxuICAgIHByaXZhdGUgaXNEcmFnZ2luZzogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgcHJpdmF0ZSBkcmFnU3RhcnRYOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBkcmFnU3RhcnRZOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBkcmFnT2Zmc2V0WDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZHJhZ09mZnNldFk6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIHN0eWxlRWw6IEhUTUxTdHlsZUVsZW1lbnQ7XHJcbiAgICBwcml2YXRlIGFjdGl2ZUxpZ2h0Ym94OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBrZXlIYW5kbGVyOiAoKGU6IEtleWJvYXJkRXZlbnQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7IC8vIDwtLSBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0NENcdTA0NDJcdTA0MzUgXHUwNDREXHUwNDQyXHUwNDNFXHJcbiAgICBcclxuICAgIC8vIFx1MDQxNFx1MDQzQlx1MDQ0RiBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0M0FcdTA0MzggXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHUwNDNFXHUwNDMyXHJcbiAgICBwcml2YXRlIHRvdWNoU3RhcnRYOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WTogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgdG91Y2hTdGFydFRpbWU6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIGlzU3dpcGluZzogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgIGFzeW5jIG9ubG9hZCgpIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnTG9hZGluZyBJbWFnZSBHYWxsZXJ5IHBsdWdpbicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGF3YWl0IHRoaXMubG9hZFNldHRpbmdzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDE3XHUwNDMwXHUwNDMzXHUwNDQwXHUwNDQzXHUwNDM2XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQ0Mlx1MDQzMFx1MDQ0Mlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzNSBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzhcclxuICAgICAgICB0aGlzLmxvYWRTdHlsZXMoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDM0XHUwNDM4XHUwNDNEXHUwNDMwXHUwNDNDXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDQxXHUwNDNBXHUwNDM4XHUwNDM1IFx1MDQ0MVx1MDQ0Mlx1MDQzOFx1MDQzQlx1MDQzOFxyXG4gICAgICAgIHRoaXMuYWRkRHluYW1pY1N0eWxlcygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMFx1MDQzNVx1MDQzM1x1MDQzOFx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzOFx1MDQ0MFx1MDQ0M1x1MDQzNVx1MDQzQyBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0EgXHUwNDMxXHUwNDNCXHUwNDNFXHUwNDNBXHUwNDNFXHUwNDMyIFx1MDQzQVx1MDQzRVx1MDQzNFx1MDQzMCBcdTA0NDEgXHUwNDNEXHUwNDMwXHUwNDQxXHUwNDQyXHUwNDQwXHUwNDMwXHUwNDM4XHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDXHUwNDRCXHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQ0RVx1MDQ0N1x1MDQzNVx1MDQzMlx1MDQ0Qlx1MDQzQyBcdTA0NDFcdTA0M0JcdTA0M0VcdTA0MzJcdTA0M0VcdTA0M0NcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyTWFya2Rvd25Db2RlQmxvY2tQcm9jZXNzb3IodGhpcy5zZXR0aW5ncy5nYWxsZXJ5S2V5d29yZCwgYXN5bmMgKHNvdXJjZSwgZWwsIGN0eCkgPT4ge1xyXG4gICAgICAgICAgICBhd2FpdCB0aGlzLnJlbmRlckdhbGxlcnkoc291cmNlLCBlbCwgY3R4KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDNBXHUwNDQzIFx1MDQzRVx1MDQ0Mlx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0Qlx1MDQ0NSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzlcclxuICAgICAgICB0aGlzLnNldHVwSW5kaXZpZHVhbEltYWdlcygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0MzJcdTA0M0FcdTA0M0JcdTA0MzBcdTA0MzRcdTA0M0FcdTA0NDMgXHUwNDNEXHUwNDMwXHUwNDQxXHUwNDQyXHUwNDQwXHUwNDNFXHUwNDM1XHUwNDNBXHJcbiAgICAgICAgdGhpcy5hZGRTZXR0aW5nVGFiKG5ldyBHYWxsZXJ5U2V0dGluZ1RhYih0aGlzLmFwcCwgdGhpcykpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBsb2FkU3R5bGVzKCkge1xyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDIgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQ0MVx1MDQ0Mlx1MDQzMFx1MDQ0Mlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQ0NSBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzVcdTA0MzlcclxuICAgICAgICBjb25zdCBzdGF0aWNTdHlsZUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICBzdGF0aWNTdHlsZUVsLmlkID0gJ29ic2lkaWFuLWdhbGxlcnktc3RhdGljLXN0eWxlcyc7XHJcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZChzdGF0aWNTdHlsZUVsKTtcclxuICAgICAgICAvLyBcdTA0MjFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzggXHUwNDMxXHUwNDQzXHUwNDM0XHUwNDQzXHUwNDQyIFx1MDQzN1x1MDQzMFx1MDQzM1x1MDQ0MFx1MDQ0M1x1MDQzNlx1MDQzNVx1MDQzRFx1MDQ0QiBcdTA0MzhcdTA0Mzcgc3R5bGVzLmNzcyBcdTA0MzBcdTA0MzJcdTA0NDJcdTA0M0VcdTA0M0NcdTA0MzBcdTA0NDJcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0M0FcdTA0MzhcclxuICAgIH1cclxuICAgIFxyXG4gICAgYWRkRHluYW1pY1N0eWxlcygpIHtcclxuICAgICAgICAvLyBcdTA0MjNcdTA0MzRcdTA0MzBcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDQyXHUwNDMwXHUwNDQwXHUwNDRCXHUwNDM5IFx1MDQzNFx1MDQzOFx1MDQzRFx1MDQzMFx1MDQzQ1x1MDQzOFx1MDQ0N1x1MDQzNVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzOSBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0NEMsIFx1MDQzNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0MzVcdTA0NDFcdTA0NDJcdTA0NENcclxuICAgICAgICBpZiAodGhpcy5zdHlsZUVsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3R5bGVFbC5yZW1vdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5zdHlsZUVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICB0aGlzLnN0eWxlRWwuaWQgPSAnb2JzaWRpYW4tZ2FsbGVyeS1keW5hbWljLXN0eWxlcyc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzNFx1MDQzOFx1MDQzRFx1MDQzMFx1MDQzQ1x1MDQzOFx1MDQ0N1x1MDQzNVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzNSBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzggXHUwNDQxIFx1MDQ0Mlx1MDQzNVx1MDQzQVx1MDQ0M1x1MDQ0OVx1MDQzOFx1MDQzQ1x1MDQzOCBcdTA0M0RcdTA0MzBcdTA0NDFcdTA0NDJcdTA0NDBcdTA0M0VcdTA0MzlcdTA0M0FcdTA0MzBcdTA0M0NcdTA0MzhcclxuICAgICAgICB0aGlzLnVwZGF0ZUR5bmFtaWNTdHlsZXMoKTtcclxuICAgICAgICBcclxuICAgICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHRoaXMuc3R5bGVFbCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHVwZGF0ZUR5bmFtaWNTdHlsZXMoKSB7XHJcbiAgICAgICAgY29uc3QgZHluYW1pY0NzcyA9IGBcclxuICAgICAgICAgICAgLmdhbGxlcnktZ3JpZCB7XHJcbiAgICAgICAgICAgICAgICBnYXA6ICR7dGhpcy5zZXR0aW5ncy5nYXBTaXplfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLyogXHUwNDEwXHUwNDM0XHUwNDMwXHUwNDNGXHUwNDQyXHUwNDM4XHUwNDMyXHUwNDNEXHUwNDMwXHUwNDRGIFx1MDQ0MVx1MDQzNVx1MDQ0Mlx1MDQzQVx1MDQzMCBcdTA0NDEgXHUwNDNFXHUwNDMzXHUwNDQwXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1XHUwNDNDIFx1MDQzQ1x1MDQzMFx1MDQzQVx1MDQ0MVx1MDQzOFx1MDQzQ1x1MDQzMFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0M0FcdTA0M0VcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0NDJcdTA0MzJcdTA0MzAgXHUwNDNBXHUwNDNFXHUwNDNCXHUwNDNFXHUwNDNEXHUwNDNFXHUwNDNBICovXHJcbiAgICAgICAgICAgIC8qIFx1MDQxNFx1MDQzNVx1MDQ0MVx1MDQzQVx1MDQ0Mlx1MDQzRVx1MDQzRiAqL1xyXG4gICAgICAgICAgICBAbWVkaWEgKG1pbi13aWR0aDogMTAyNHB4KSB7XHJcbiAgICAgICAgICAgICAgICAuZ2FsbGVyeS1ncmlkIHtcclxuICAgICAgICAgICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpbGwsIG1pbm1heChjYWxjKDEwMCUgLyBtaW4oJHt0aGlzLnNldHRpbmdzLm1heENvbHVtbnNEZXNrdG9wfSwgdmFyKC0taW1hZ2UtY291bnQsICR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zRGVza3RvcH0pKSAtIDIwcHgpLCAxZnIpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLyogXHUwNDFGXHUwNDNCXHUwNDMwXHUwNDNEXHUwNDQ4XHUwNDM1XHUwNDQyICovXHJcbiAgICAgICAgICAgIEBtZWRpYSAobWluLXdpZHRoOiA3NjhweCkgYW5kIChtYXgtd2lkdGg6IDEwMjNweCkge1xyXG4gICAgICAgICAgICAgICAgLmdhbGxlcnktZ3JpZCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maWxsLCBtaW5tYXgoY2FsYygxMDAlIC8gbWluKCR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zVGFibGV0fSwgdmFyKC0taW1hZ2UtY291bnQsICR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zVGFibGV0fSkpIC0gMjBweCksIDFmcikpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvKiBcdTA0MUNcdTA0M0VcdTA0MzFcdTA0MzhcdTA0M0JcdTA0NENcdTA0M0RcdTA0NEJcdTA0MzkgKi9cclxuICAgICAgICAgICAgQG1lZGlhIChtYXgtd2lkdGg6IDc2N3B4KSB7XHJcbiAgICAgICAgICAgICAgICAuZ2FsbGVyeS1ncmlkIHtcclxuICAgICAgICAgICAgICAgICAgICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpbGwsIG1pbm1heChjYWxjKDEwMCUgLyBtaW4oJHt0aGlzLnNldHRpbmdzLm1heENvbHVtbnNNb2JpbGV9LCB2YXIoLS1pbWFnZS1jb3VudCwgJHt0aGlzLnNldHRpbmdzLm1heENvbHVtbnNNb2JpbGV9KSkgLSAyMHB4KSwgMWZyKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8qIFx1MDQyMVx1MDQ0Mlx1MDQzOFx1MDQzQlx1MDQ0QyBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDNFXHUwNDQyXHUwNDM0XHUwNDM1XHUwNDNCXHUwNDRDXHUwNDNEXHUwNDRCXHUwNDQ1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOSAqL1xyXG4gICAgICAgICAgICAubWFya2Rvd24tc291cmNlLXZpZXcgaW1nOm5vdCguZ2FsbGVyeS1pdGVtIGltZyksXHJcbiAgICAgICAgICAgIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcgaW1nOm5vdCguZ2FsbGVyeS1pdGVtIGltZykge1xyXG4gICAgICAgICAgICAgICAgY3Vyc29yOiB6b29tLWluO1xyXG4gICAgICAgICAgICAgICAgdHJhbnNpdGlvbjogb3BhY2l0eSAwLjJzIGVhc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC5tYXJrZG93bi1zb3VyY2UtdmlldyBpbWc6bm90KC5nYWxsZXJ5LWl0ZW0gaW1nKTpob3ZlcixcclxuICAgICAgICAgICAgLm1hcmtkb3duLXByZXZpZXctdmlldyBpbWc6bm90KC5nYWxsZXJ5LWl0ZW0gaW1nKTpob3ZlciB7XHJcbiAgICAgICAgICAgICAgICBvcGFjaXR5OiAwLjk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICBgO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuc3R5bGVFbC50ZXh0Q29udGVudCA9IGR5bmFtaWNDc3M7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGFzeW5jIHJlbmRlckdhbGxlcnkoc291cmNlOiBzdHJpbmcsIGVsOiBIVE1MRWxlbWVudCwgY3R4OiBNYXJrZG93blBvc3RQcm9jZXNzb3JDb250ZXh0KSB7XHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDQ3XHUwNDM4XHUwNDQ5XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzRVx1MDQzRFx1MDQ0Mlx1MDQzNVx1MDQzOVx1MDQzRFx1MDQzNVx1MDQ0MFxyXG4gICAgICAgIGVsLmVtcHR5KCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzRVx1MDQzRFx1MDQ0Mlx1MDQzNVx1MDQzOVx1MDQzRFx1MDQzNVx1MDQ0MCBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4XHJcbiAgICAgICAgY29uc3QgZ2FsbGVyeUNvbnRhaW5lciA9IGVsLmNyZWF0ZURpdih7IGNsczogJ2dhbGxlcnktY29udGFpbmVyJyB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUZcdTA0MzBcdTA0NDBcdTA0NDFcdTA0MzhcdTA0M0MgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzOFx1MDQzNyBcdTA0MzFcdTA0M0JcdTA0M0VcdTA0M0FcdTA0MzAgXHUwNDNBXHUwNDNFXHUwNDM0XHUwNDMwXHJcbiAgICAgICAgY29uc3QgaW1hZ2VSZWdleCA9IC8hXFxbXFxbKC4qP1xcLig/OmpwZ3xqcGVnfHBuZ3xnaWZ8Ym1wfHN2Z3x3ZWJwfHRpZmZ8YXZpZikpKD86XFx8Lio/KT9cXF1cXF0vZ2k7XHJcbiAgICAgICAgY29uc3QgaW1hZ2VNYXRjaGVzID0gc291cmNlLm1hdGNoKGltYWdlUmVnZXgpIHx8IFtdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChpbWFnZU1hdGNoZXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIGdhbGxlcnlDb250YWluZXIuc2V0VGV4dCgnTm8gaW1hZ2VzIGZvdW5kIGluIGdhbGxlcnkgYmxvY2suJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQzNVx1MDQ0Mlx1MDQzQVx1MDQ0MyBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzlcclxuICAgICAgICBjb25zdCBncmlkID0gZ2FsbGVyeUNvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdnYWxsZXJ5LWdyaWQnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyM1x1MDQ0MVx1MDQ0Mlx1MDQzMFx1MDQzRFx1MDQzMFx1MDQzMlx1MDQzQlx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBDU1MgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDNEXHUwNDQzXHUwNDRFIFx1MDQ0MSBcdTA0M0FcdTA0M0VcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0NDJcdTA0MzJcdTA0M0VcdTA0M0MgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5XHJcbiAgICAgICAgZ3JpZC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1pbWFnZS1jb3VudCcsIGltYWdlTWF0Y2hlcy5sZW5ndGgudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDMxXHUwNDM4XHUwNDQwXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzNFx1MDQzMFx1MDQzRFx1MDQzRFx1MDQ0Qlx1MDQzNSBcdTA0M0VcdTA0MzEgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHUwNDQ1XHJcbiAgICAgICAgY29uc3QgaW1hZ2VzOiBBcnJheTx7c3JjOiBzdHJpbmcsIGFsdDogc3RyaW5nfT4gPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBmb3IgKGNvbnN0IG1hdGNoIG9mIGltYWdlTWF0Y2hlcykge1xyXG4gICAgICAgICAgICBjb25zdCBmdWxsTWF0Y2ggPSBtYXRjaC5tYXRjaCgvIVxcW1xcWyguKj8pKD86XFx8KC4qPykpP1xcXVxcXS8pO1xyXG4gICAgICAgICAgICBpZiAoIWZ1bGxNYXRjaCkgY29udGludWU7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zdCBmaWxlbmFtZSA9IGZ1bGxNYXRjaFsxXTtcclxuICAgICAgICAgICAgY29uc3QgYWx0VGV4dCA9IGZ1bGxNYXRjaFsyXSB8fCBmaWxlbmFtZS5zcGxpdCgnLycpLnBvcCgpIHx8IGZpbGVuYW1lO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQzRVx1MDQzQlx1MDQ0M1x1MDQ0N1x1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0ZcdTA0NDNcdTA0NDJcdTA0NEMgXHUwNDNBIFx1MDQ0NFx1MDQzMFx1MDQzOVx1MDQzQlx1MDQ0M1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZmlsZSA9IHRoaXMuYXBwLm1ldGFkYXRhQ2FjaGUuZ2V0Rmlyc3RMaW5rcGF0aERlc3QoZmlsZW5hbWUsIGN0eC5zb3VyY2VQYXRoKTtcclxuICAgICAgICAgICAgICAgIGlmICghZmlsZSkgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQzRVx1MDQzQlx1MDQ0M1x1MDQ0N1x1MDQzMFx1MDQzNVx1MDQzQyBVUkwgXHUwNDQwXHUwNDM1XHUwNDQxXHUwNDQzXHUwNDQwXHUwNDQxXHUwNDMwXHJcbiAgICAgICAgICAgICAgICBjb25zdCByZXNvdXJjZVBhdGggPSB0aGlzLmFwcC52YXVsdC5nZXRSZXNvdXJjZVBhdGgoZmlsZSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDIgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbWdDb250YWluZXIgPSBncmlkLmNyZWF0ZURpdih7IGNsczogJ2dhbGxlcnktaXRlbScgfSk7XHJcbiAgICAgICAgICAgICAgICBpbWdDb250YWluZXIuc2V0QXR0cmlidXRlKCdkYXRhLXNyYycsIHJlc291cmNlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpbWdDb250YWluZXIuc2V0QXR0cmlidXRlKCdkYXRhLWFsdCcsIGFsdFRleHQpO1xyXG4gICAgICAgICAgICAgICAgaW1nQ29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcsIGltYWdlcy5sZW5ndGgudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IGltZyA9IGltZ0NvbnRhaW5lci5jcmVhdGVFbCgnaW1nJywge1xyXG4gICAgICAgICAgICAgICAgICAgIGF0dHI6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgc3JjOiByZXNvdXJjZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGFsdDogYWx0VGV4dCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9hZGluZzogJ2xhenknXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQVx1MDQzOCBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4XHJcbiAgICAgICAgICAgICAgICBpbWdDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlLmJ1dHRvbiA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzFcdTA0MzhcdTA0NDBcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDMyXHUwNDQxXHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RiBcdTA0MzhcdTA0MzcgXHUwNDREXHUwNDQyXHUwNDNFXHUwNDM5IFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzOFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBnYWxsZXJ5SW1hZ2VzID0gQXJyYXkuZnJvbShncmlkLnF1ZXJ5U2VsZWN0b3JBbGwoJy5nYWxsZXJ5LWl0ZW0nKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC5tYXAoaXRlbSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtc3JjJykgfHwgJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYWx0OiBpdGVtLmdldEF0dHJpYnV0ZSgnZGF0YS1hbHQnKSB8fCAnJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5kZXggPSBwYXJzZUludChpbWdDb250YWluZXIuZ2V0QXR0cmlidXRlKCdkYXRhLWluZGV4JykgfHwgJzAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vcGVuTGlnaHRib3goZ2FsbGVyeUltYWdlcywgaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpbWFnZXMucHVzaCh7XHJcbiAgICAgICAgICAgICAgICAgICAgc3JjOiByZXNvdXJjZVBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgYWx0OiBhbHRUZXh0XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgbG9hZGluZyBpbWFnZTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIG9wZW5MaWdodGJveChpbWFnZXM6IEFycmF5PHtzcmM6IHN0cmluZywgYWx0OiBzdHJpbmd9Piwgc3RhcnRJbmRleDogbnVtYmVyKSB7XHJcbiAgICAgICAgLy8gXHUwNDE3XHUwNDMwXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzRlx1MDQ0MFx1MDQzNVx1MDQzNFx1MDQ0Qlx1MDQzNFx1MDQ0M1x1MDQ0OVx1MDQzOFx1MDQzOSBsaWdodGJveCwgXHUwNDM1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQ0Q1xyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZUxpZ2h0Ym94KSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VMaWdodGJveCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgYmFja2Ryb3BcclxuICAgICAgICBjb25zdCBiYWNrZHJvcCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGJhY2tkcm9wLmNsYXNzTmFtZSA9ICdsZy1iYWNrZHJvcCc7XHJcbiAgICAgICAgdGhpcy5hY3RpdmVMaWdodGJveCA9IGJhY2tkcm9wO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0VcdTA0M0RcdTA0NDJcdTA0MzVcdTA0MzlcdTA0M0RcdTA0MzVcdTA0NDAgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIGNvbnN0IGltYWdlQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgaW1hZ2VDb250YWluZXIuY2xhc3NOYW1lID0gJ2xnLWltYWdlLWNvbnRhaW5lcic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQ0RFx1MDQzQlx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQzRFx1MDQ0MiBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBjb25zdCBpbWcgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdpbWcnKTtcclxuICAgICAgICBpbWcuY2xhc3NOYW1lID0gJ2xnLWltYWdlJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDREXHUwNDNCXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyXHUwNDRCIFx1MDQ0M1x1MDQzRlx1MDQ0MFx1MDQzMFx1MDQzMlx1MDQzQlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIGNvbnN0IHByZXZCdG4gPSB0aGlzLmNyZWF0ZUJ1dHRvbignXHUyMTkwJywgJ2xnLWJ0biBsZy1wcmV2Jyk7XHJcbiAgICAgICAgY29uc3QgbmV4dEJ0biA9IHRoaXMuY3JlYXRlQnV0dG9uKCdcdTIxOTInLCAnbGctYnRuIGxnLW5leHQnKTtcclxuICAgICAgICBjb25zdCBjb3VudGVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgY291bnRlci5jbGFzc05hbWUgPSAnbGctY291bnRlcic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFBXHUwNDNEXHUwNDNFXHUwNDNGXHUwNDNBXHUwNDM4IFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMVx1MDQzOFx1MDQ0MFx1MDQzRVx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIC8vY29uc3Qgem9vbUluQnRuID0gdGhpcy5jcmVhdGVCdXR0b24oJysnLCAnbGctYnRuJyk7XHJcbiAgICAgICAgLy9jb25zdCB6b29tT3V0QnRuID0gdGhpcy5jcmVhdGVCdXR0b24oJy0nLCAnbGctYnRuJyk7XHJcbiAgICAgICAgLy9jb25zdCByZXNldFpvb21CdG4gPSB0aGlzLmNyZWF0ZUJ1dHRvbignXHUyMUJCJywgJ2xnLWJ0bicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8qY29uc3Qgem9vbUNvbnRyb2xzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XHJcbiAgICAgICAgem9vbUNvbnRyb2xzLmNsYXNzTmFtZSA9ICdsZy16b29tLWNvbnRyb2xzJztcclxuICAgICAgICB6b29tQ29udHJvbHMuYXBwZW5kQ2hpbGQoem9vbUluQnRuKTtcclxuICAgICAgICB6b29tQ29udHJvbHMuYXBwZW5kQ2hpbGQoem9vbU91dEJ0bik7XHJcbiAgICAgICAgem9vbUNvbnRyb2xzLmFwcGVuZENoaWxkKHJlc2V0Wm9vbUJ0bik7XHJcbiAgICAgICAgKi9cclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNDXHUwNDM4XHUwNDNEXHUwNDM4XHUwNDMwXHUwNDQyXHUwNDRFXHUwNDQwXHUwNDRCLCBcdTA0MzVcdTA0NDFcdTA0M0JcdTA0MzggXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5IFx1MDQzMVx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQ0OFx1MDQzNSAxXHJcbiAgICAgICAgbGV0IHRodW1ibmFpbHNDb250YWluZXI6IEhUTUxFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgY29uc3QgdGh1bWJzOiBIVE1MSW1hZ2VFbGVtZW50W10gPSBbXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaW1hZ2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgdGh1bWJuYWlsc0NvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgICAgICB0aHVtYm5haWxzQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdsZy10aHVtYm5haWxzJztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGltYWdlcy5mb3JFYWNoKChpbWFnZSwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRodW1iID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgICAgICAgICAgICAgICB0aHVtYi5jbGFzc05hbWUgPSAnbGctdGh1bWJuYWlsJztcclxuICAgICAgICAgICAgICAgIHRodW1iLnNyYyA9IGltYWdlLnNyYztcclxuICAgICAgICAgICAgICAgIHRodW1iLnNldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcsIGluZGV4LnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgdGh1bWIuYWx0ID0gaW1hZ2UuYWx0O1xyXG4gICAgICAgICAgICAgICAgdGh1bWIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVMaWdodGJveEltYWdlKGltYWdlcywgaW5kZXgsIGltZywgY291bnRlciwgdGh1bWJzKTtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW5kZXggPSBpbmRleDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlc2V0Wm9vbUFuZFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIHRodW1ibmFpbHNDb250YWluZXIhLmFwcGVuZENoaWxkKHRodW1iKTtcclxuICAgICAgICAgICAgICAgIHRodW1icy5wdXNoKHRodW1iKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDJcdTA0NEIgXHUwNDMyIGJhY2tkcm9wXHJcbiAgICAgICAgYmFja2Ryb3AuYXBwZW5kQ2hpbGQoaW1hZ2VDb250YWluZXIpO1xyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFwcGVuZENoaWxkKGltZyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDE0XHUwNDNFXHUwNDMxXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzRFx1MDQzRVx1MDQzRlx1MDQzQVx1MDQzOCBcdTA0M0RcdTA0MzBcdTA0MzJcdTA0MzhcdTA0MzNcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzggXHUwNDQyXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDNBXHUwNDNFIFx1MDQzNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0MzFcdTA0M0VcdTA0M0JcdTA0NENcdTA0NDhcdTA0MzUgXHUwNDNFXHUwNDM0XHUwNDNEXHUwNDNFXHUwNDMzXHUwNDNFIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIGlmIChpbWFnZXMubGVuZ3RoID4gMSkge1xyXG4gICAgICAgICAgICBiYWNrZHJvcC5hcHBlbmRDaGlsZChwcmV2QnRuKTtcclxuICAgICAgICAgICAgYmFja2Ryb3AuYXBwZW5kQ2hpbGQobmV4dEJ0bik7XHJcbiAgICAgICAgICAgIGJhY2tkcm9wLmFwcGVuZENoaWxkKHRodW1ibmFpbHNDb250YWluZXIhKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyBcdTA0MTRcdTA0M0JcdTA0NEYgXHUwNDNFXHUwNDM0XHUwNDM4XHUwNDNEXHUwNDNFXHUwNDQ3XHUwNDNEXHUwNDRCXHUwNDQ1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOSBcdTA0NDFcdTA0M0FcdTA0NDBcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNEXHUwNDMwXHUwNDMyXHUwNDM4XHUwNDMzXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDRFIFx1MDQzOCBcdTA0NDFcdTA0NDdcdTA0MzVcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0FcclxuICAgICAgICAgICAgY291bnRlci5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBiYWNrZHJvcC5hcHBlbmRDaGlsZChjb3VudGVyKTtcclxuICAgICAgICAvL2JhY2tkcm9wLmFwcGVuZENoaWxkKHpvb21Db250cm9scyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDE0XHUwNDNFXHUwNDMxXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIGJhY2tkcm9wIFx1MDQzMiBET01cclxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGJhY2tkcm9wKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTFcdTA0M0JcdTA0M0VcdTA0M0FcdTA0MzhcdTA0NDBcdTA0NDNcdTA0MzVcdTA0M0MgXHUwNDNGXHUwNDQwXHUwNDNFXHUwNDNBXHUwNDQwXHUwNDQzXHUwNDQyXHUwNDNBXHUwNDQzIFx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzMFx1MDQzRFx1MDQzOFx1MDQ0Nlx1MDQ0QlxyXG4gICAgICAgIGRvY3VtZW50LmJvZHkuc3R5bGUub3ZlcmZsb3cgPSAnaGlkZGVuJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjJcdTA0MzVcdTA0M0FcdTA0NDNcdTA0NDlcdTA0MzhcdTA0MzkgXHUwNDM4XHUwNDNEXHUwNDM0XHUwNDM1XHUwNDNBXHUwNDQxIFx1MDQzOCBcdTA0NDFcdTA0M0VcdTA0NDFcdTA0NDJcdTA0M0VcdTA0NEZcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDNDXHUwNDMwXHUwNDQxXHUwNDQ4XHUwNDQyXHUwNDMwXHUwNDMxXHUwNDMwXHJcbiAgICAgICAgbGV0IGN1cnJlbnRJbmRleCA9IHN0YXJ0SW5kZXg7XHJcbiAgICAgICAgdGhpcy56b29tTGV2ZWwgPSAxO1xyXG4gICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuZHJhZ09mZnNldFggPSAwO1xyXG4gICAgICAgIHRoaXMuZHJhZ09mZnNldFkgPSAwO1xyXG4gICAgICAgIHRoaXMuaXNTd2lwaW5nID0gZmFsc2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDI0XHUwNDQzXHUwNDNEXHUwNDNBXHUwNDQ2XHUwNDM4XHUwNDRGIFx1MDQzRVx1MDQzMVx1MDQzRFx1MDQzRVx1MDQzMlx1MDQzQlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RiBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBjb25zdCB1cGRhdGVJbWFnZSA9ICgpID0+IHtcclxuICAgICAgICAgICAgaW1nLnNyYyA9IGltYWdlc1tjdXJyZW50SW5kZXhdLnNyYztcclxuICAgICAgICAgICAgaW1nLmFsdCA9IGltYWdlc1tjdXJyZW50SW5kZXhdLmFsdDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQyMVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQ0MVx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDJcdTA0NDBcdTA0MzBcdTA0M0RcdTA0NDFcdTA0NDRcdTA0M0VcdTA0NDBcdTA0M0NcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzhcclxuICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0M0RcdTA0M0VcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDQ3XHUwNDM1XHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHJcbiAgICAgICAgICAgIGNvdW50ZXIudGV4dENvbnRlbnQgPSBgJHtjdXJyZW50SW5kZXggKyAxfSAvICR7aW1hZ2VzLmxlbmd0aH1gO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzMFx1MDQzQVx1MDQ0Mlx1MDQzOFx1MDQzMlx1MDQzRFx1MDQ0M1x1MDQ0RSBcdTA0M0NcdTA0MzhcdTA0M0RcdTA0MzhcdTA0MzBcdTA0NDJcdTA0NEVcdTA0NDBcdTA0NDNcclxuICAgICAgICAgICAgdGh1bWJzLmZvckVhY2goKHRodW1iLCBpbmRleCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGh1bWIuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgaW5kZXggPT09IGN1cnJlbnRJbmRleCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDQwXHUwNDNFXHUwNDNBXHUwNDQwXHUwNDQzXHUwNDQ3XHUwNDM4XHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQ1x1MDQzOFx1MDQzRFx1MDQzOFx1MDQzMFx1MDQ0Mlx1MDQ0RVx1MDQ0MFx1MDQ0MyBcdTA0MzIgXHUwNDMyXHUwNDM4XHUwNDM0XHUwNDM4XHUwNDNDXHUwNDQzXHUwNDRFIFx1MDQzRVx1MDQzMVx1MDQzQlx1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0Q1xyXG4gICAgICAgICAgICBpZiAodGh1bWJzW2N1cnJlbnRJbmRleF0pIHtcclxuICAgICAgICAgICAgICAgIHRodW1ic1tjdXJyZW50SW5kZXhdLnNjcm9sbEludG9WaWV3KHtcclxuICAgICAgICAgICAgICAgICAgICBiZWhhdmlvcjogJ3Ntb290aCcsXHJcbiAgICAgICAgICAgICAgICAgICAgYmxvY2s6ICduZWFyZXN0JyxcclxuICAgICAgICAgICAgICAgICAgICBpbmxpbmU6ICdjZW50ZXInXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDI0XHUwNDQzXHUwNDNEXHUwNDNBXHUwNDQ2XHUwNDM4XHUwNDRGIFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQVx1MDQzQlx1MDQ0RVx1MDQ0N1x1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RiBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBjb25zdCBzd2l0Y2hJbWFnZSA9IChkaXJlY3Rpb246ICduZXh0JyB8ICdwcmV2JykgPT4ge1xyXG4gICAgICAgICAgICBpZiAoaW1hZ2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChkaXJlY3Rpb24gPT09ICduZXh0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJbmRleCA9IChjdXJyZW50SW5kZXggKyAxKSAlIGltYWdlcy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRJbmRleCA9IChjdXJyZW50SW5kZXggLSAxICsgaW1hZ2VzLmxlbmd0aCkgJSBpbWFnZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdXBkYXRlSW1hZ2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDI0XHUwNDQzXHUwNDNEXHUwNDNBXHUwNDQ2XHUwNDM4XHUwNDRGIFx1MDQzN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQ0Mlx1MDQzOFx1MDQ0RiBsaWdodGJveFxyXG4gICAgICAgIGNvbnN0IGNsb3NlTGlnaHRib3ggPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VMaWdodGJveCgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHUwNDM4IFx1MDQzRFx1MDQzMFx1MDQzMlx1MDQzOFx1MDQzM1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQzOCAoXHUwNDQyXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDNBXHUwNDNFIFx1MDQzNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0MzFcdTA0M0VcdTA0M0JcdTA0NENcdTA0NDhcdTA0MzUgXHUwNDNFXHUwNDM0XHUwNDNEXHUwNDNFXHUwNDMzXHUwNDNFIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RilcclxuICAgICAgICBpZiAoaW1hZ2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgcHJldkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoSW1hZ2UoJ3ByZXYnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBuZXh0QnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2hJbWFnZSgnbmV4dCcpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHUwNDM4IFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMVx1MDQzOFx1MDQ0MFx1MDQzRVx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIC8qem9vbUluQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnpvb21MZXZlbCA9IE1hdGgubWluKHRoaXMuem9vbUxldmVsICogMS4yLCA1KTtcclxuICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgem9vbU91dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy56b29tTGV2ZWwgPSBNYXRoLm1heCh0aGlzLnpvb21MZXZlbCAvIDEuMiwgMC41KTtcclxuICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmVzZXRab29tQnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJlc2V0Wm9vbUFuZFBvc2l0aW9uKCk7XHJcbiAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKDBweCwgMHB4KSBzY2FsZSgxKWA7XHJcbiAgICAgICAgfSk7Ki9cclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0FcdTA0MzggXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzNFx1MDQzMlx1MDQzRVx1MDQzOVx1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0M0FcdTA0M0JcdTA0MzhcdTA0M0FcdTA0MzAvXHUwNDQyXHUwNDMwXHUwNDNGXHUwNDMwIChcdTA0NDFcdTA0MzFcdTA0NDBcdTA0M0VcdTA0NDEgXHUwNDNDXHUwNDMwXHUwNDQxXHUwNDQ4XHUwNDQyXHUwNDMwXHUwNDMxXHUwNDMwKVxyXG4gICAgICAgIGxldCBsYXN0VGFwVGltZSA9IDA7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgaGFuZGxlRG91YmxlVGFwID0gKGU6IE1vdXNlRXZlbnQgfCBUb3VjaEV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0MzBcdTA0NDFcdTA0NDEgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQ0MVx1MDQzRlx1MDQzNVx1MDQ0Nlx1MDQzOFx1MDQzMFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQzRVx1MDQzOSBcdTA0MzBcdTA0M0RcdTA0MzhcdTA0M0NcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzggXHUwNDM3XHUwNDQzXHUwNDNDXHUwNDMwXHJcbiAgICAgICAgICAgIGltZy5jbGFzc0xpc3QuYWRkKCd6b29taW5nJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MjFcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDFcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDM3XHUwNDQzXHUwNDNDIFx1MDQzOCBcdTA0M0ZcdTA0M0VcdTA0MzdcdTA0MzhcdTA0NDZcdTA0MzhcdTA0NEVcclxuICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICBpbWcuc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZSgwcHgsIDBweCkgc2NhbGUoMSknO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDIzXHUwNDMxXHUwNDM4XHUwNDQwXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQzMFx1MDQ0MVx1MDQ0MSBcdTA0M0ZcdTA0M0VcdTA0NDFcdTA0M0JcdTA0MzUgXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDNDXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaW1nLmNsYXNzTGlzdC5yZW1vdmUoJ3pvb21pbmcnKTtcclxuICAgICAgICAgICAgfSwgMzAwKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzMlx1MDQzRVx1MDQzOVx1MDQzRFx1MDQzRVx1MDQzOSBcdTA0M0FcdTA0M0JcdTA0MzhcdTA0M0EgXHUwNDNDXHUwNDRCXHUwNDQ4XHUwNDRDXHUwNDRFXHJcbiAgICAgICAgaW1hZ2VDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignZGJsY2xpY2snLCBoYW5kbGVEb3VibGVUYXApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzMlx1MDQzRVx1MDQzOVx1MDQzRFx1MDQzRVx1MDQzOSBcdTA0NDJcdTA0MzBcdTA0M0YgXHUwNDNEXHUwNDMwIFx1MDQzQ1x1MDQzRVx1MDQzMVx1MDQzOFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0Qlx1MDQ0NVxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRhcExlbmd0aCA9IGN1cnJlbnRUaW1lIC0gbGFzdFRhcFRpbWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICh0YXBMZW5ndGggPCAzMDAgJiYgdGFwTGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1MDQxNFx1MDQzMlx1MDQzRVx1MDQzOVx1MDQzRFx1MDQzRVx1MDQzOSBcdTA0NDJcdTA0MzBcdTA0M0ZcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVEb3VibGVUYXAoZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGxhc3RUYXBUaW1lID0gY3VycmVudFRpbWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUNcdTA0MzBcdTA0NDFcdTA0NDhcdTA0NDJcdTA0MzBcdTA0MzFcdTA0MzhcdTA0NDBcdTA0M0VcdTA0MzJcdTA0MzBcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDNBXHUwNDNFXHUwNDNCXHUwNDM1XHUwNDQxXHUwNDM4XHUwNDNBXHUwNDNFXHUwNDNDIFx1MDQzQ1x1MDQ0Qlx1MDQ0OFx1MDQzOFxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3doZWVsJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgZGVsdGEgPSBlLmRlbHRhWSA+IDAgPyAwLjkgOiAxLjE7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbUxldmVsID0gTWF0aC5tYXgoMC41LCBNYXRoLm1pbih0aGlzLnpvb21MZXZlbCAqIGRlbHRhLCA1KSk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpbWcuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke3RoaXMuZHJhZ09mZnNldFh9cHgsICR7dGhpcy5kcmFnT2Zmc2V0WX1weCkgc2NhbGUoJHt0aGlzLnpvb21MZXZlbH0pYDtcclxuICAgICAgICB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0Mlx1MDQzMFx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgKFx1MDQ0Mlx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzQVx1MDQzRSBcdTA0M0ZcdTA0NDBcdTA0MzggXHUwNDM3XHUwNDQzXHUwNDNDXHUwNDM1ID4gMSlcclxuICAgICAgICBjb25zdCBzdGFydERyYWcgPSAoY2xpZW50WDogbnVtYmVyLCBjbGllbnRZOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuem9vbUxldmVsID4gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGltYWdlQ29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ2RyYWdnaW5nJyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYWdTdGFydFggPSBjbGllbnRYIC0gdGhpcy5kcmFnT2Zmc2V0WDtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJhZ1N0YXJ0WSA9IGNsaWVudFkgLSB0aGlzLmRyYWdPZmZzZXRZO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBkb0RyYWcgPSAoY2xpZW50WDogbnVtYmVyLCBjbGllbnRZOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNEcmFnZ2luZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnT2Zmc2V0WCA9IGNsaWVudFggLSB0aGlzLmRyYWdTdGFydFg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYWdPZmZzZXRZID0gY2xpZW50WSAtIHRoaXMuZHJhZ1N0YXJ0WTtcclxuICAgICAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7dGhpcy5kcmFnT2Zmc2V0WH1weCwgJHt0aGlzLmRyYWdPZmZzZXRZfXB4KSBzY2FsZSgke3RoaXMuem9vbUxldmVsfSlgO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBlbmREcmFnID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgaW1hZ2VDb250YWluZXIuY2xhc3NMaXN0LnJlbW92ZSgnZHJhZ2dpbmcnKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIE1vdXNlIGV2ZW50cyBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDQyXHUwNDMwXHUwNDQxXHUwNDNBXHUwNDM4XHUwNDMyXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgaW1hZ2VDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vkb3duJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUuYnV0dG9uID09PSAwKSB7IC8vIFx1MDQxQlx1MDQzNVx1MDQzMlx1MDQzMFx1MDQ0RiBcdTA0M0FcdTA0M0RcdTA0M0VcdTA0M0ZcdTA0M0FcdTA0MzAgXHUwNDNDXHUwNDRCXHUwNDQ4XHUwNDM4XHJcbiAgICAgICAgICAgICAgICBzdGFydERyYWcoZS5jbGllbnRYLCBlLmNsaWVudFkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2Vtb3ZlJywgKGUpID0+IHtcclxuICAgICAgICAgICAgZG9EcmFnKGUuY2xpZW50WCwgZS5jbGllbnRZKTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZXVwJywgZW5kRHJhZyk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVG91Y2ggXHUwNDQxXHUwNDNFXHUwNDMxXHUwNDRCXHUwNDQyXHUwNDM4XHUwNDRGIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0M0NcdTA0M0VcdTA0MzFcdTA0MzhcdTA0M0JcdTA0NENcdTA0M0RcdTA0NEJcdTA0NDUgKFx1MDQzNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzOFx1MDQzQyBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcdTA0NEIgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzRFx1MDQzMFx1MDQzMlx1MDQzOFx1MDQzM1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQzOClcclxuICAgICAgICBsZXQgaW5pdGlhbERpc3RhbmNlOiBudW1iZXIgfCBudWxsID0gbnVsbDtcclxuICAgICAgICBsZXQgaW5pdGlhbFRvdWNoZXM6IFRvdWNoTGlzdCB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgIGxldCBpc1BpbmNoaW5nID0gZmFsc2U7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaW1hZ2VDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2hzdGFydCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09PSAyKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MURcdTA0MzBcdTA0NDdcdTA0MzBcdTA0M0JcdTA0M0UgXHUwNDM2XHUwNDM1XHUwNDQxXHUwNDQyXHUwNDMwIHBpbmNoXHJcbiAgICAgICAgICAgICAgICBpc1BpbmNoaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxEaXN0YW5jZSA9IE1hdGguaHlwb3QoXHJcbiAgICAgICAgICAgICAgICAgICAgZS50b3VjaGVzWzBdLmNsaWVudFggLSBlLnRvdWNoZXNbMV0uY2xpZW50WCxcclxuICAgICAgICAgICAgICAgICAgICBlLnRvdWNoZXNbMF0uY2xpZW50WSAtIGUudG91Y2hlc1sxXS5jbGllbnRZXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgaW5pdGlhbFRvdWNoZXMgPSBlLnRvdWNoZXM7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLnpvb21MZXZlbCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRFx1MDQzMFx1MDQ0N1x1MDQzMFx1MDQzQlx1MDQzRSBcdTA0M0ZcdTA0MzVcdTA0NDBcdTA0MzVcdTA0NDJcdTA0MzBcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzJcdTA0MzBcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDQzXHUwNDMyXHUwNDM1XHUwNDNCXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDNEXHUwNDNEXHUwNDNFXHUwNDMzXHUwNDNFIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgICAgICAgICAgc3RhcnREcmFnKGUudG91Y2hlc1swXS5jbGllbnRYLCBlLnRvdWNoZXNbMF0uY2xpZW50WSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDE3XHUwNDMwXHUwNDNGXHUwNDNFXHUwNDNDXHUwNDM4XHUwNDNEXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzRFx1MDQzMFx1MDQ0N1x1MDQzMFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0M1x1MDQ0RSBcdTA0NDJcdTA0M0VcdTA0NDdcdTA0M0FcdTA0NDMgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQ0MVx1MDQzMlx1MDQzMFx1MDQzOVx1MDQzRlx1MDQzMFxyXG4gICAgICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0WCA9IGUudG91Y2hlc1swXS5jbGllbnRYO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0WSA9IGUudG91Y2hlc1swXS5jbGllbnRZO1xyXG4gICAgICAgICAgICAgICAgdGhpcy50b3VjaFN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzU3dpcGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaW1hZ2VDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcigndG91Y2htb3ZlJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDIgJiYgaW5pdGlhbERpc3RhbmNlICE9PSBudWxsICYmIGluaXRpYWxUb3VjaGVzICYmIGlzUGluY2hpbmcpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxNlx1MDQzNVx1MDQ0MVx1MDQ0MiBwaW5jaCB6b29tXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50RGlzdGFuY2UgPSBNYXRoLmh5cG90KFxyXG4gICAgICAgICAgICAgICAgICAgIGUudG91Y2hlc1swXS5jbGllbnRYIC0gZS50b3VjaGVzWzFdLmNsaWVudFgsXHJcbiAgICAgICAgICAgICAgICAgICAgZS50b3VjaGVzWzBdLmNsaWVudFkgLSBlLnRvdWNoZXNbMV0uY2xpZW50WVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3Qgc2NhbGUgPSBjdXJyZW50RGlzdGFuY2UgLyBpbml0aWFsRGlzdGFuY2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb21MZXZlbCA9IE1hdGgubWF4KDAuNSwgTWF0aC5taW4odGhpcy56b29tTGV2ZWwgKiBzY2FsZSwgNSkpO1xyXG4gICAgICAgICAgICAgICAgaW5pdGlhbERpc3RhbmNlID0gY3VycmVudERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpbWcuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke3RoaXMuZHJhZ09mZnNldFh9cHgsICR7dGhpcy5kcmFnT2Zmc2V0WX1weCkgc2NhbGUoJHt0aGlzLnpvb21MZXZlbH0pYDtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLnRvdWNoZXMubGVuZ3RoID09PSAxICYmIHRoaXMuaXNEcmFnZ2luZykge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDQyXHUwNDMwXHUwNDQxXHUwNDNBXHUwNDM4XHUwNDMyXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQ0M1x1MDQzMlx1MDQzNVx1MDQzQlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQzRFx1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICAgICAgICAgIGRvRHJhZyhlLnRvdWNoZXNbMF0uY2xpZW50WCwgZS50b3VjaGVzWzBdLmNsaWVudFkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDEgJiYgdGhpcy56b29tTGV2ZWwgPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRVx1MDQzRlx1MDQ0MFx1MDQzNVx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcclxuICAgICAgICAgICAgICAgIGNvbnN0IHRvdWNoID0gZS50b3VjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsdGFYID0gdG91Y2guY2xpZW50WCAtIHRoaXMudG91Y2hTdGFydFg7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZWx0YVkgPSB0b3VjaC5jbGllbnRZIC0gdGhpcy50b3VjaFN0YXJ0WTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDE1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzNFx1MDQzMlx1MDQzOFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0M0ZcdTA0M0UgXHUwNDMzXHUwNDNFXHUwNDQwXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDNEXHUwNDQyXHUwNDMwXHUwNDNCXHUwNDM4IFx1MDQzMVx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQ0OFx1MDQzNSwgXHUwNDQ3XHUwNDM1XHUwNDNDIFx1MDQzRlx1MDQzRSBcdTA0MzJcdTA0MzVcdTA0NDBcdTA0NDJcdTA0MzhcdTA0M0FcdTA0MzBcdTA0M0JcdTA0MzgsIFx1MDQ0RFx1MDQ0Mlx1MDQzRSBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcclxuICAgICAgICAgICAgICAgIGlmIChNYXRoLmFicyhkZWx0YVgpID4gTWF0aC5hYnMoZGVsdGFZKSAmJiBNYXRoLmFicyhkZWx0YVgpID4gMTApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzU3dpcGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDNCXHUwNDM1XHUwNDMzXHUwNDNBXHUwNDMwIFx1MDQ0MVx1MDQzQ1x1MDQzNVx1MDQ0OVx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzMlx1MDQzOFx1MDQzN1x1MDQ0M1x1MDQzMFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQzRVx1MDQzOSBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDJcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDQxXHUwNDMyXHUwNDRGXHUwNDM3XHUwNDM4XHJcbiAgICAgICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHtkZWx0YVggKiAwLjV9cHgsIDBweCkgc2NhbGUoMSlgO1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZW5kJywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGlzUGluY2hpbmcpIHtcclxuICAgICAgICAgICAgICAgIGlzUGluY2hpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxEaXN0YW5jZSA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsVG91Y2hlcyA9IG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGVuZERyYWcoKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmICh0aGlzLnpvb21MZXZlbCA9PT0gMSAmJiAhaXNQaW5jaGluZyAmJiAhdGhpcy5pc0RyYWdnaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3VjaCA9IGUuY2hhbmdlZFRvdWNoZXNbMF07XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZWx0YVggPSB0b3VjaC5jbGllbnRYIC0gdGhpcy50b3VjaFN0YXJ0WDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhWSA9IHRvdWNoLmNsaWVudFkgLSB0aGlzLnRvdWNoU3RhcnRZO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsdGFUaW1lID0gRGF0ZS5ub3coKSAtIHRoaXMudG91Y2hTdGFydFRpbWU7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRVx1MDQzRlx1MDQ0MFx1MDQzNVx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1pblN3aXBlRGlzdGFuY2UgPSA1MDtcclxuICAgICAgICAgICAgICAgIGNvbnN0IG1heFN3aXBlVGltZSA9IDMwMDtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuaXNTd2lwaW5nICYmIE1hdGguYWJzKGRlbHRhWCkgPiBtaW5Td2lwZURpc3RhbmNlICYmIGRlbHRhVGltZSA8IG1heFN3aXBlVGltZSkge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGIFx1MDQzMlx1MDQzQlx1MDQzNVx1MDQzMlx1MDQzRSAtIFx1MDQ0MVx1MDQzQlx1MDQzNVx1MDQzNFx1MDQ0M1x1MDQ0RVx1MDQ0OVx1MDQzNVx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzVcclxuICAgICAgICAgICAgICAgIGlmIChkZWx0YVggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoSW1hZ2UoJ3ByZXYnKTtcclxuICAgICAgICAgICAgICAgIH0gXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MjFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0YgXHUwNDMyXHUwNDNGXHUwNDQwXHUwNDMwXHUwNDMyXHUwNDNFIC0gXHUwNDNGXHUwNDQwXHUwNDM1XHUwNDM0XHUwNDRCXHUwNDM0XHUwNDQzXHUwNDQ5XHUwNDM1XHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoSW1hZ2UoJ25leHQnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MjFcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDFcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDNDXHUwNDM1XHUwNDQ5XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMHB4LCAwcHgpIHNjYWxlKDEpJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5pc1N3aXBpbmcgPSBmYWxzZTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MURcdTA0MzBcdTA0MzJcdTA0MzhcdTA0MzNcdTA0MzBcdTA0NDZcdTA0MzhcdTA0NEYgXHUwNDNBXHUwNDNCXHUwNDMwXHUwNDMyXHUwNDM4XHUwNDQ4XHUwNDMwXHUwNDNDXHUwNDM4XHJcbiAgICAgICAgdGhpcy5rZXlIYW5kbGVyID0gKGU6IEtleWJvYXJkRXZlbnQpID0+IHsgLy8gPC0tIFx1MDQxOFx1MDQ0MVx1MDQzRlx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzN1x1MDQ0M1x1MDQzOVx1MDQ0Mlx1MDQzNSB0aGlzLmtleUhhbmRsZXIgXHUwNDMyXHUwNDNDXHUwNDM1XHUwNDQxXHUwNDQyXHUwNDNFIGNvbnN0IGtleUhhbmRsZXJcclxuICAgICAgICAgICAgaWYgKGUua2V5ID09PSAnRXNjYXBlJykge1xyXG4gICAgICAgICAgICAgICAgY2xvc2VMaWdodGJveCgpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGltYWdlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdBcnJvd0xlZnQnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoSW1hZ2UoJ3ByZXYnKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICdBcnJvd1JpZ2h0Jykge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaEltYWdlKCduZXh0Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJysnIHx8IGUua2V5ID09PSAnPScpIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbUxldmVsID0gTWF0aC5taW4odGhpcy56b29tTGV2ZWwgKiAxLjIsIDUpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICctJyB8fCBlLmtleSA9PT0gJ18nKSB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb21MZXZlbCA9IE1hdGgubWF4KHRoaXMuem9vbUxldmVsIC8gMS4yLCAwLjUpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoMHB4LCAwcHgpIHNjYWxlKDEpYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCB0aGlzLmtleUhhbmRsZXIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQ0Mlx1MDQzOFx1MDQzNSBcdTA0M0ZcdTA0M0UgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDQzIFx1MDQzRFx1MDQzMCBiYWNrZHJvcCAoXHUwNDNCXHUwNDRFXHUwNDMxXHUwNDQzXHUwNDRFIFx1MDQzRVx1MDQzMVx1MDQzQlx1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0QylcclxuICAgICAgICBiYWNrZHJvcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDJcdTA0M0VcdTA0M0JcdTA0NENcdTA0M0FcdTA0M0UgXHUwNDM1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQSBcdTA0MzFcdTA0NEJcdTA0M0IgXHUwNDNEXHUwNDM1IFx1MDQzRFx1MDQzMCBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDJcdTA0MzBcdTA0NDUgXHUwNDQzXHUwNDNGXHUwNDQwXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzOCBcdTA0M0RcdTA0MzUgXHUwNDNEXHUwNDMwIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOCBcdTA0M0ZcdTA0NDBcdTA0MzggXHUwNDM3XHUwNDQzXHUwNDNDXHUwNDM1ID0gMVxyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gYmFja2Ryb3AgfHwgXHJcbiAgICAgICAgICAgICAgICAodGFyZ2V0ID09PSBpbWFnZUNvbnRhaW5lciAmJiB0aGlzLnpvb21MZXZlbCA9PT0gMSkgfHxcclxuICAgICAgICAgICAgICAgICh0YXJnZXQgPT09IGltZyAmJiB0aGlzLnpvb21MZXZlbCA9PT0gMSkpIHtcclxuICAgICAgICAgICAgICAgIGNsb3NlTGlnaHRib3goKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxMFx1MDQzRFx1MDQzOFx1MDQzQ1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQ0RiBcdTA0M0ZcdTA0M0VcdTA0NEZcdTA0MzJcdTA0M0JcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGJhY2tkcm9wLmNsYXNzTGlzdC5hZGQoJ2luJyksIDEwKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUZcdTA0M0VcdTA0M0FcdTA0MzBcdTA0MzdcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDMyXHUwNDNFXHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNVxyXG4gICAgICAgIHRoaXMudXBkYXRlTGlnaHRib3hJbWFnZShpbWFnZXMsIHN0YXJ0SW5kZXgsIGltZywgY291bnRlciwgdGh1bWJzKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSBjbG9zZUxpZ2h0Ym94KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZUxpZ2h0Ym94KSB7XHJcbiAgICAgICAgLy8gXHUwNDIzXHUwNDM0XHUwNDMwXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQSBcdTA0M0FcdTA0M0JcdTA0MzBcdTA0MzJcdTA0MzhcdTA0NDhcclxuICAgICAgICAgICAgaWYgKHRoaXMua2V5SGFuZGxlcikge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIHRoaXMua2V5SGFuZGxlcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmtleUhhbmRsZXIgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKHRoaXMuYWN0aXZlTGlnaHRib3gpO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2ZUxpZ2h0Ym94ID0gbnVsbDtcclxuICAgICAgICAgICAgZG9jdW1lbnQuYm9keS5zdHlsZS5vdmVyZmxvdyA9ICcnO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSBjcmVhdGVCdXR0b24odGV4dDogc3RyaW5nLCBjbGFzc05hbWU6IHN0cmluZyk6IEhUTUxCdXR0b25FbGVtZW50IHtcclxuICAgICAgICBjb25zdCBidG4gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdidXR0b24nKTtcclxuICAgICAgICBidG4uY2xhc3NOYW1lID0gY2xhc3NOYW1lO1xyXG4gICAgICAgIGJ0bi5pbm5lckhUTUwgPSB0ZXh0O1xyXG4gICAgICAgIHJldHVybiBidG47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHByaXZhdGUgdXBkYXRlTGlnaHRib3hJbWFnZShcclxuICAgICAgICBpbWFnZXM6IEFycmF5PHtzcmM6IHN0cmluZywgYWx0OiBzdHJpbmd9PiwgXHJcbiAgICAgICAgaW5kZXg6IG51bWJlciwgXHJcbiAgICAgICAgaW1nOiBIVE1MSW1hZ2VFbGVtZW50LCBcclxuICAgICAgICBjb3VudGVyOiBIVE1MRWxlbWVudCxcclxuICAgICAgICB0aHVtYnM6IEhUTUxJbWFnZUVsZW1lbnRbXVxyXG4gICAgKSB7XHJcbiAgICAgICAgaW1nLnNyYyA9IGltYWdlc1tpbmRleF0uc3JjO1xyXG4gICAgICAgIGltZy5hbHQgPSBpbWFnZXNbaW5kZXhdLmFsdDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjFcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDFcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDQyXHUwNDQwXHUwNDMwXHUwNDNEXHUwNDQxXHUwNDQ0XHUwNDNFXHUwNDQwXHUwNDNDXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4IFx1MDQzRlx1MDQ0MFx1MDQzOCBcdTA0NDFcdTA0M0NcdTA0MzVcdTA0M0RcdTA0MzUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDBweCwgMHB4KSBzY2FsZSgxKSc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQ0N1x1MDQzNVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQVxyXG4gICAgICAgIGNvdW50ZXIudGV4dENvbnRlbnQgPSBgJHtpbmRleCArIDF9IC8gJHtpbWFnZXMubGVuZ3RofWA7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzMFx1MDQzQVx1MDQ0Mlx1MDQzOFx1MDQzMlx1MDQzRFx1MDQ0M1x1MDQ0RSBcdTA0M0NcdTA0MzhcdTA0M0RcdTA0MzhcdTA0MzBcdTA0NDJcdTA0NEVcdTA0NDBcdTA0NDNcclxuICAgICAgICB0aHVtYnMuZm9yRWFjaCgodGh1bWIsIGkpID0+IHtcclxuICAgICAgICAgICAgdGh1bWIuY2xhc3NMaXN0LnRvZ2dsZSgnYWN0aXZlJywgaSA9PT0gaW5kZXgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIHJlc2V0Wm9vbUFuZFBvc2l0aW9uKCkge1xyXG4gICAgICAgIHRoaXMuem9vbUxldmVsID0gMTtcclxuICAgICAgICB0aGlzLmRyYWdPZmZzZXRYID0gMDtcclxuICAgICAgICB0aGlzLmRyYWdPZmZzZXRZID0gMDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSBzZXR1cEluZGl2aWR1YWxJbWFnZXMoKSB7XHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0M0VcdTA0NDJcdTA0MzRcdTA0MzVcdTA0M0JcdTA0NENcdTA0M0RcdTA0NEJcdTA0NDUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5IFx1MDQzMiBcdTA0MzdcdTA0MzBcdTA0M0NcdTA0MzVcdTA0NDJcdTA0M0FcdTA0MzVcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyRG9tRXZlbnQoZG9jdW1lbnQsICdjbGljaycsIChlOiBNb3VzZUV2ZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0IGFzIEhUTUxFbGVtZW50O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDQwXHUwNDNFXHUwNDNGXHUwNDQzXHUwNDQxXHUwNDNBXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQVx1MDQzOCBcdTA0M0RcdTA0MzAgXHUwNDREXHUwNDNCXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyXHUwNDMwXHUwNDQ1IFx1MDQzQlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzMVx1MDQzRVx1MDQzQVx1MDQ0MVx1MDQzMFxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0LmNsb3Nlc3QoJy5sZy1iYWNrZHJvcCcpIHx8IFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LmNsb3Nlc3QoJy5sZy1idG4nKSB8fCBcclxuICAgICAgICAgICAgICAgIHRhcmdldC5jbG9zZXN0KCcubGctdGh1bWJuYWlsJykgfHxcclxuICAgICAgICAgICAgICAgIHRhcmdldC5jbG9zZXN0KCcubGctem9vbS1jb250cm9scycpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQ0MFx1MDQzRVx1MDQzRlx1MDQ0M1x1MDQ0MVx1MDQzQVx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0MzhcdTA0M0FcdTA0MzggXHUwNDNEXHUwNDMwIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0Rlx1MDQ0NSBcdTA0MzIgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM1XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmdhbGxlcnktaXRlbScpKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxOFx1MDQ0OVx1MDQzNVx1MDQzQyBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUsIFx1MDQzRFx1MDQzMCBcdTA0M0FcdTA0M0VcdTA0NDJcdTA0M0VcdTA0NDBcdTA0M0VcdTA0MzUgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDNEXHUwNDQzXHUwNDNCXHUwNDM4XHJcbiAgICAgICAgICAgIGxldCBpbWdFbGVtZW50OiBIVE1MSW1hZ2VFbGVtZW50IHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAodGFyZ2V0LnRhZ05hbWUgPT09ICdJTUcnKSB7XHJcbiAgICAgICAgICAgICAgICBpbWdFbGVtZW50ID0gdGFyZ2V0IGFzIEhUTUxJbWFnZUVsZW1lbnQ7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodGFyZ2V0LmNsYXNzTGlzdC5jb250YWlucygnaW50ZXJuYWwtZW1iZWQnKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDE0XHUwNDNCXHUwNDRGIFx1MDQzMlx1MDQzRFx1MDQ0M1x1MDQ0Mlx1MDQ0MFx1MDQzNVx1MDQzRFx1MDQzRFx1MDQzOFx1MDQ0NSBlbWJlZCBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzkgT2JzaWRpYW5cclxuICAgICAgICAgICAgICAgIGltZ0VsZW1lbnQgPSB0YXJnZXQucXVlcnlTZWxlY3RvcignaW1nJyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmICghaW1nRWxlbWVudCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MUZcdTA0NDBcdTA0M0VcdTA0MzJcdTA0MzVcdTA0NDBcdTA0NEZcdTA0MzVcdTA0M0MsIFx1MDQ0N1x1MDQ0Mlx1MDQzRSBcdTA0NERcdTA0NDJcdTA0M0UgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzOFx1MDQzNyBcdTA0MzdcdTA0MzBcdTA0M0NcdTA0MzVcdTA0NDJcdTA0M0FcdTA0MzggKFx1MDQzRFx1MDQzNSBcdTA0NDdcdTA0MzBcdTA0NDFcdTA0NDJcdTA0NEMgXHUwNDM4XHUwNDNEXHUwNDQyXHUwNDM1XHUwNDQwXHUwNDQ0XHUwNDM1XHUwNDM5XHUwNDQxXHUwNDMwIE9ic2lkaWFuKVxyXG4gICAgICAgICAgICBjb25zdCBpc05vdGVJbWFnZSA9IGltZ0VsZW1lbnQuY2xvc2VzdCgnLm1hcmtkb3duLXNvdXJjZS12aWV3LCAubWFya2Rvd24tcHJldmlldy12aWV3Jyk7XHJcbiAgICAgICAgICAgIGlmICghaXNOb3RlSW1hZ2UpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDNFXHUwNDNCXHUwNDQzXHUwNDQ3XHUwNDMwXHUwNDM1XHUwNDNDIHNyYyBcdTA0MzggYWx0XHJcbiAgICAgICAgICAgIGNvbnN0IHNyYyA9IGltZ0VsZW1lbnQuZ2V0QXR0cmlidXRlKCdzcmMnKTtcclxuICAgICAgICAgICAgY29uc3QgYWx0ID0gaW1nRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ2FsdCcpIHx8ICcnO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDQwXHUwNDNFXHUwNDMyXHUwNDM1XHUwNDQwXHUwNDRGXHUwNDM1XHUwNDNDLCBcdTA0NDdcdTA0NDJcdTA0M0Ugc3JjIFx1MDQ0MVx1MDQ0M1x1MDQ0OVx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzMlx1MDQ0M1x1MDQzNVx1MDQ0MiBcdTA0MzggXHUwNDNEXHUwNDM1IFx1MDQ0Rlx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQ0Mlx1MDQ0MVx1MDQ0RiBkYXRhLVVSSVxyXG4gICAgICAgICAgICBpZiAoc3JjICYmICFzcmMuc3RhcnRzV2l0aCgnZGF0YTonKSAmJiAhc3JjLmluY2x1ZGVzKCdodHRwOi8vJykgJiYgIXNyYy5pbmNsdWRlcygnaHR0cHM6Ly8nKSkge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDFFXHUwNDQyXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzMVx1MDQzRVx1MDQzQVx1MDQ0MSBcdTA0NDEgXHUwNDNFXHUwNDM0XHUwNDNEXHUwNDM4XHUwNDNDIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNVx1MDQzQ1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3BlbkxpZ2h0Ym94KFt7IHNyYywgYWx0IH1dLCAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMlx1MDQzMFx1MDQzQVx1MDQzNlx1MDQzNSBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0MzBcdTA0NDJcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzMiBNYXJrZG93biBwcmV2aWV3XHJcbiAgICAgICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duUG9zdFByb2Nlc3NvcigoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBpbWFnZXMgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZzpub3QoLmdhbGxlcnktaXRlbSBpbWcpJyk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpbWFnZXMuZm9yRWFjaCgoaW1nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDNBXHUwNDQzXHUwNDQwXHUwNDQxXHUwNDNFXHUwNDQwIFx1MDQ0M1x1MDQzQVx1MDQzMFx1MDQzN1x1MDQzMFx1MDQ0Mlx1MDQzNVx1MDQzQlx1MDQ0RiBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDM4XHUwNDNEXHUwNDM0XHUwNDM4XHUwNDNBXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4XHJcbiAgICAgICAgICAgICAgICBpbWcuc3R5bGUuY3Vyc29yID0gJ3pvb20taW4nO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBIFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQVx1MDQzMFxyXG4gICAgICAgICAgICAgICAgaW1nLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBzcmMgPSBpbWcuZ2V0QXR0cmlidXRlKCdzcmMnKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBhbHQgPSBpbWcuZ2V0QXR0cmlidXRlKCdhbHQnKSB8fCAnJztcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoc3JjICYmICFzcmMuc3RhcnRzV2l0aCgnZGF0YTonKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9wZW5MaWdodGJveChbeyBzcmMsIGFsdCB9XSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBhc3luYyBsb2FkU2V0dGluZ3MoKSB7XHJcbiAgICAgICAgdGhpcy5zZXR0aW5ncyA9IE9iamVjdC5hc3NpZ24oe30sIERFRkFVTFRfU0VUVElOR1MsIGF3YWl0IHRoaXMubG9hZERhdGEoKSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGFzeW5jIHNhdmVTZXR0aW5ncygpIHtcclxuICAgICAgICBhd2FpdCB0aGlzLnNhdmVEYXRhKHRoaXMuc2V0dGluZ3MpO1xyXG4gICAgICAgIHRoaXMudXBkYXRlRHluYW1pY1N0eWxlcygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzM1x1MDQzOFx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzOFx1MDQ0MFx1MDQ0M1x1MDQzNVx1MDQzQyBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0EgXHUwNDQxIFx1MDQzRFx1MDQzRVx1MDQzMlx1MDQ0Qlx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0MzJcdTA0NEJcdTA0M0MgXHUwNDQxXHUwNDNCXHUwNDNFXHUwNDMyXHUwNDNFXHUwNDNDXHJcbiAgICAgICAgdGhpcy5hcHAud29ya3NwYWNlLm9mZignZmlsZS1vcGVuJywgKCkgPT4ge30pO1xyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJNYXJrZG93bkNvZGVCbG9ja1Byb2Nlc3Nvcih0aGlzLnNldHRpbmdzLmdhbGxlcnlLZXl3b3JkLCBhc3luYyAoc291cmNlLCBlbCwgY3R4KSA9PiB7XHJcbiAgICAgICAgICAgIGF3YWl0IHRoaXMucmVuZGVyR2FsbGVyeShzb3VyY2UsIGVsLCBjdHgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMucmVmcmVzaEFsbEdhbGxlcmllcygpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICByZWZyZXNoQWxsR2FsbGVyaWVzKCkge1xyXG4gICAgICAgIGNvbnN0IGdhbGxlcnlDb250YWluZXJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmdhbGxlcnktY29udGFpbmVyJyk7XHJcbiAgICAgICAgZ2FsbGVyeUNvbnRhaW5lcnMuZm9yRWFjaChjb250YWluZXIgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBncmlkID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy5nYWxsZXJ5LWdyaWQnKTtcclxuICAgICAgICAgICAgaWYgKGdyaWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gZ3JpZC5xdWVyeVNlbGVjdG9yQWxsKCcuZ2FsbGVyeS1pdGVtJyk7XHJcbiAgICAgICAgICAgICAgICBncmlkLnN0eWxlLnNldFByb3BlcnR5KCctLWltYWdlLWNvdW50JywgaXRlbXMubGVuZ3RoLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIG9udW5sb2FkKCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdVbmxvYWRpbmcgSW1hZ2UgR2FsbGVyeSBwbHVnaW4nKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjNcdTA0MzRcdTA0MzBcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDM4XHJcbiAgICAgICAgY29uc3Qgc3RhdGljU3R5bGVFbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdvYnNpZGlhbi1nYWxsZXJ5LXN0YXRpYy1zdHlsZXMnKTtcclxuICAgICAgICBpZiAoc3RhdGljU3R5bGVFbCkge1xyXG4gICAgICAgICAgICBzdGF0aWNTdHlsZUVsLnJlbW92ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBpZiAodGhpcy5zdHlsZUVsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3R5bGVFbC5yZW1vdmUoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5jbG9zZUxpZ2h0Ym94KCk7XHJcbiAgICB9XHJcbn1cclxuXHJcbmNsYXNzIEdhbGxlcnlTZXR0aW5nVGFiIGV4dGVuZHMgUGx1Z2luU2V0dGluZ1RhYiB7XHJcbiAgICBwbHVnaW46IEltYWdlR2FsbGVyeVBsdWdpbjtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoYXBwOiBBcHAsIHBsdWdpbjogSW1hZ2VHYWxsZXJ5UGx1Z2luKSB7XHJcbiAgICAgICAgc3VwZXIoYXBwLCBwbHVnaW4pO1xyXG4gICAgICAgIHRoaXMucGx1Z2luID0gcGx1Z2luO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBkaXNwbGF5KCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IHsgY29udGFpbmVyRWwgfSA9IHRoaXM7XHJcbiAgICAgICAgY29udGFpbmVyRWwuZW1wdHkoKTtcclxuICAgICAgICBcclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDEnLCB7IHRleHQ6ICdOaWNlIEdhbGxlcnkgU2V0dGluZ3MnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IG1hbmlmZXN0ID0gKHRoaXMucGx1Z2luIGFzIGFueSkubWFuaWZlc3Q7XHJcbiAgICAgICAgaWYgKG1hbmlmZXN0ICYmIG1hbmlmZXN0LnZlcnNpb24pIHtcclxuICAgICAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ3AnLCB7IFxyXG4gICAgICAgICAgICAgICAgdGV4dDogYCdWaWJlIGNvZGluZyBieSBAS29uZmV0aWdyLiBWZXJzaW9uOiAke21hbmlmZXN0LnZlcnNpb259YCxcclxuICAgICAgICAgICAgICAgIGNsczogJ2dhbGxlcnktdmVyc2lvbi1pbmZvJ1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdHYWxsZXJ5IGtleXdvcmQuIHwgXHUwNDFBXHUwNDNCXHUwNDRFXHUwNDQ3XHUwNDM1XHUwNDMyXHUwNDNFXHUwNDM1IFx1MDQ0MVx1MDQzQlx1MDQzRVx1MDQzMlx1MDQzRSBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDNFXHUwNDMxXHUwNDRBXHUwNDRGXHUwNDMyXHUwNDNCXHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzOCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdLZXl3b3JkIGZvciB0aGUgY29kZSBibG9jayAoZS5nLiwgXCJnYWxsZXJ5XCIsIFwiaW1hZ2VzXCIsIFwicGhvdG9zXCIpLicpXHJcbiAgICAgICAgICAgIC5hZGRUZXh0KHRleHQgPT4gdGV4dFxyXG4gICAgICAgICAgICAgICAgLnNldFBsYWNlaG9sZGVyKCdnYWxsZXJ5JylcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5nYWxsZXJ5S2V5d29yZClcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nYWxsZXJ5S2V5d29yZCA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMicsIHsgdGV4dDogJ01heGltdW0gY29sdW1ucyBvbjogfCBcdTA0MjFcdTA0M0FcdTA0M0VcdTA0M0JcdTA0NENcdTA0M0FcdTA0M0UgXHUwNDQ0XHUwNDNFXHUwNDQyXHUwNDNFXHUwNDNBIFx1MDQzMlx1MDQzQ1x1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzOFx1MDQ0Mlx1MDQ0MVx1MDQ0RiBcdTA0MzIgXHUwNDQxXHUwNDQyXHUwNDQwXHUwNDNFXHUwNDNBXHUwNDQzOicgfSk7XHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdEZXNrdG9wJylcclxuICAgICAgICAgICAgLnNldERlc2MoJ01heGltdW0gbnVtYmVyIG9mIGNvbHVtbnMgb24gbGFyZ2Ugc2NyZWVucyAoXHUyMjY1MTAyNHB4KS4gQWN0dWFsIGNvbHVtbnMgd2lsbCBhZGp1c3QgYmFzZWQgb24gaW1hZ2UgY291bnQuJylcclxuICAgICAgICAgICAgLmFkZFNsaWRlcihzbGlkZXIgPT4gc2xpZGVyXHJcbiAgICAgICAgICAgICAgICAuc2V0TGltaXRzKDEsIDgsIDEpXHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4Q29sdW1uc0Rlc2t0b3ApXHJcbiAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1heENvbHVtbnNEZXNrdG9wID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdUYWJsZXQnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnTWF4aW11bSBudW1iZXIgb2YgY29sdW1ucyBvbiBtZWRpdW0gc2NyZWVucyAoNzY4cHgtMTAyM3B4KScpXHJcbiAgICAgICAgICAgIC5hZGRTbGlkZXIoc2xpZGVyID0+IHNsaWRlclxyXG4gICAgICAgICAgICAgICAgLnNldExpbWl0cygxLCA2LCAxKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heENvbHVtbnNUYWJsZXQpXHJcbiAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1heENvbHVtbnNUYWJsZXQgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICBcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ01vYmlsZScpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdNYXhpbXVtIG51bWJlciBvZiBjb2x1bW5zIG9uIHNtYWxsIHNjcmVlbnMgKDw3NjhweCknKVxyXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHNsaWRlciA9PiBzbGlkZXJcclxuICAgICAgICAgICAgICAgIC5zZXRMaW1pdHMoMSwgNCwgMSlcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhDb2x1bW5zTW9iaWxlKVxyXG4gICAgICAgICAgICAgICAgLnNldER5bmFtaWNUb29sdGlwKClcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhDb2x1bW5zTW9iaWxlID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgbmV3IFNldHRpbmcoY29udGFpbmVyRWwpXHJcbiAgICAgICAgICAgIC5zZXROYW1lKCdHYXAgYmV0d2VlbiBpbWFnZXMgfCBcdTA0MjBcdTA0MzBcdTA0NDFcdTA0NDFcdTA0NDJcdTA0M0VcdTA0NEZcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDNDXHUwNDM1XHUwNDM2XHUwNDM0XHUwNDQzIFx1MDQ0NFx1MDQzRVx1MDQ0Mlx1MDQzQVx1MDQzMFx1MDQzQ1x1MDQzOCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdTcGFjZSBiZXR3ZWVuIHRodW1ibmFpbHMgKGUuZy4sIDEycHgsIDFyZW0pJylcclxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJzEycHgnKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmdhcFNpemUpXHJcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MuZ2FwU2l6ZSA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCBkb2N1bWVudGF0aW9uIHNlY3Rpb25cclxuICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgnaDMnLCB7IHRleHQ6ICdEb2N1bWVudGF0aW9uIC8gXHUwNDE0XHUwNDNFXHUwNDNBXHUwNDQzXHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDRGJyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBkb2NDb250YWluZXIgPSBjb250YWluZXJFbC5jcmVhdGVEaXYoeyBjbHM6ICdnYWxsZXJ5LWRvYy1jb250YWluZXInIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEVuZ2xpc2ggZG9jdW1lbnRhdGlvblxyXG4gICAgICAgIGNvbnN0IGVuRG9jID0gZG9jQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2dhbGxlcnktZG9jLXNlY3Rpb24nIH0pO1xyXG4gICAgICAgIGVuRG9jLmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ1x1RDgzRFx1RENENiBIb3cgdG8gdXNlIHRoZSBHYWxsZXJ5IFBsdWdpbicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZW5Eb2MuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdUaGUgcGx1Z2luIHByb3ZpZGVzIHR3byB3YXlzIHRvIHZpZXcgaW1hZ2VzOicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5MaXN0ID0gZW5Eb2MuY3JlYXRlRWwoJ3VsJyk7XHJcbiAgICAgICAgZW5MaXN0LmNyZWF0ZUVsKCdsaScpLmlubmVySFRNTCA9ICc8c3Ryb25nPkluZGl2aWR1YWwgaW1hZ2VzOjwvc3Ryb25nPiBDbGljayBvbiBhbnkgaW1hZ2UgaW4geW91ciBub3RlIHRvIG9wZW4gaXQgaW4gYSBsaWdodGJveCB2aWV3ZXIgd2l0aCB6b29tIGFuZCBwYW4gZnVuY3Rpb25hbGl0eS4nO1xyXG4gICAgICAgIGVuTGlzdC5jcmVhdGVFbCgnbGknKS5pbm5lckhUTUwgPSAnPHN0cm9uZz5JbWFnZSBnYWxsZXJpZXM6PC9zdHJvbmc+IENyZWF0ZSBnYWxsZXJpZXMgdXNpbmcgY29kZSBibG9ja3Mgd2l0aCB5b3VyIGNob3NlbiBrZXl3b3JkLic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZW5Eb2MuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdUbyBjcmVhdGUgYSBnYWxsZXJ5LCB1c2UgYSBjb2RlIGJsb2NrIHdpdGggeW91ciBnYWxsZXJ5IGtleXdvcmQ6JyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBlbkV4YW1wbGUgPSBlbkRvYy5jcmVhdGVFbCgncHJlJyk7XHJcbiAgICAgICAgZW5FeGFtcGxlLnN0eWxlLmNzc1RleHQgPSAnYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpOyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA1cHg7IG92ZXJmbG93LXg6IGF1dG87JztcclxuICAgICAgICBlbkV4YW1wbGUuY3JlYXRlRWwoJ2NvZGUnKS5pbm5lclRleHQgPSBgXFxgXFxgXFxgZ2FsbGVyeVxyXG4hW1tpbWFnZTEuanBnXV1cclxuIVtbaW1hZ2UyLnBuZ3xPcHRpb25hbCBjYXB0aW9uXV1cclxuIVtbcGhvdG8zLmpwZ11dXHJcbiFbW3NjcmVlbnNob3QucG5nfEFub3RoZXIgaW1hZ2Ugd2l0aCBjYXB0aW9uXV1cclxuXFxgXFxgXFxgYDtcclxuICAgICAgICBcclxuICAgICAgICBlbkRvYy5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ0dhbGxlcnkgZmVhdHVyZXM6JyB9KTtcclxuICAgICAgICBjb25zdCBlbkZlYXR1cmVzID0gZW5Eb2MuY3JlYXRlRWwoJ3VsJyk7XHJcbiAgICAgICAgZW5GZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnQ2xpY2sgb24gYW55IHRodW1ibmFpbCB0byBvcGVuIHRoZSBsaWdodGJveCc7XHJcbiAgICAgICAgZW5GZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnTmF2aWdhdGUgYmV0d2VlbiBpbWFnZXMgd2l0aCBhcnJvdyBrZXlzIG9yIHN3aXBlJztcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdab29tIHdpdGggbW91c2Ugd2hlZWwsIHBpbmNoIGdlc3R1cmUnO1xyXG4gICAgICAgIGVuRmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1BhbiBieSBkcmFnZ2luZyB3aGVuIHpvb21lZCBpbic7XHJcbiAgICAgICAgZW5GZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnRG91YmxlLWNsaWNrL3RhcCB0byByZXNldCB6b29tJztcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdQcmVzcyBFc2NhcGUgdG8gY2xvc2UgdGhlIGxpZ2h0Ym94JztcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdJZiB0aGUgcGhvdG8gaXMgem9vbWVkIGluLCB0aGUgbGlnaHRib3ggd2lsbCBub3QgY2xvc2UgYnkgY2xpY2tpbmcgb24gdGhlIGltYWdlLiBEb3VibGUtdGFwIHRvIHJlc2V0IHRoZSB6b29tJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBSdXNzaWFuIGRvY3VtZW50YXRpb25cclxuICAgICAgICBjb25zdCBydURvYyA9IGRvY0NvbnRhaW5lci5jcmVhdGVEaXYoeyBjbHM6ICdnYWxsZXJ5LWRvYy1zZWN0aW9uJyB9KTtcclxuICAgICAgICBydURvYy5jcmVhdGVFbCgnaDQnLCB7IHRleHQ6ICdcdUQ4M0RcdURDRDYgXHUwNDFBXHUwNDMwXHUwNDNBIFx1MDQzOFx1MDQ0MVx1MDQzRlx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzN1x1MDQzRVx1MDQzMlx1MDQzMFx1MDQ0Mlx1MDQ0QyBcdTA0M0ZcdTA0M0JcdTA0MzBcdTA0MzNcdTA0MzhcdTA0M0QgXHUwNDEzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDRGJyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBydURvYy5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1x1MDQxRlx1MDQzQlx1MDQzMFx1MDQzM1x1MDQzOFx1MDQzRCBcdTA0M0ZcdTA0NDBcdTA0MzVcdTA0MzRcdTA0M0VcdTA0NDFcdTA0NDJcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0NDIgXHUwNDM0XHUwNDMyXHUwNDMwIFx1MDQ0MVx1MDQzRlx1MDQzRVx1MDQ0MVx1MDQzRVx1MDQzMVx1MDQzMCBcdTA0M0ZcdTA0NDBcdTA0M0VcdTA0NDFcdTA0M0NcdTA0M0VcdTA0NDJcdTA0NDBcdTA0MzAgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5OicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgcnVMaXN0ID0gcnVEb2MuY3JlYXRlRWwoJ3VsJyk7XHJcbiAgICAgICAgcnVMaXN0LmNyZWF0ZUVsKCdsaScpLmlubmVySFRNTCA9ICc8c3Ryb25nPlx1MDQxRVx1MDQ0Mlx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0Qlx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEY6PC9zdHJvbmc+IFx1MDQxQVx1MDQzQlx1MDQzOFx1MDQzQVx1MDQzRFx1MDQzOFx1MDQ0Mlx1MDQzNSBcdTA0M0RcdTA0MzAgXHUwNDNCXHUwNDRFXHUwNDMxXHUwNDNFXHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0MzIgXHUwNDM3XHUwNDMwXHUwNDNDXHUwNDM1XHUwNDQyXHUwNDNBXHUwNDM1LCBcdTA0NDdcdTA0NDJcdTA0M0VcdTA0MzFcdTA0NEIgXHUwNDNFXHUwNDQyXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDQyXHUwNDRDIFx1MDQzNVx1MDQzM1x1MDQzRSBcdTA0MzIgXHUwNDNCXHUwNDMwXHUwNDM5XHUwNDQyXHUwNDMxXHUwNDNFXHUwNDNBXHUwNDQxXHUwNDM1IFx1MDQ0MSBcdTA0MzJcdTA0M0VcdTA0MzdcdTA0M0NcdTA0M0VcdTA0MzZcdTA0M0RcdTA0M0VcdTA0NDFcdTA0NDJcdTA0NENcdTA0NEUgXHUwNDQzXHUwNDMyXHUwNDM1XHUwNDNCXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzOCBcdTA0M0ZcdTA0MzVcdTA0NDBcdTA0MzVcdTA0M0NcdTA0MzVcdTA0NDlcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYuJztcclxuICAgICAgICBydUxpc3QuY3JlYXRlRWwoJ2xpJykuaW5uZXJIVE1MID0gJzxzdHJvbmc+XHUwNDEzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOTo8L3N0cm9uZz4gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDQyXHUwNDM1IFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzOCBcdTA0NDEgXHUwNDNGXHUwNDNFXHUwNDNDXHUwNDNFXHUwNDQ5XHUwNDRDXHUwNDRFIFx1MDQzMVx1MDQzQlx1MDQzRVx1MDQzQVx1MDQzRVx1MDQzMiBcdTA0M0FcdTA0M0VcdTA0MzRcdTA0MzAgXHUwNDQxIFx1MDQzMlx1MDQ0Qlx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzRFx1MDQzRFx1MDQ0Qlx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0MzJcdTA0NEJcdTA0M0MgXHUwNDQxXHUwNDNCXHUwNDNFXHUwNDMyXHUwNDNFXHUwNDNDLic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcnVEb2MuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdcdTA0MjdcdTA0NDJcdTA0M0VcdTA0MzFcdTA0NEIgXHUwNDQxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDQyXHUwNDRDIFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0RSwgXHUwNDM4XHUwNDQxXHUwNDNGXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDM3XHUwNDQzXHUwNDM5XHUwNDQyXHUwNDM1IFx1MDQzMVx1MDQzQlx1MDQzRVx1MDQzQSBcdTA0M0FcdTA0M0VcdTA0MzRcdTA0MzAgXHUwNDQxIFx1MDQzMlx1MDQzMFx1MDQ0OFx1MDQzOFx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0MzJcdTA0NEJcdTA0M0MgXHUwNDQxXHUwNDNCXHUwNDNFXHUwNDMyXHUwNDNFXHUwNDNDOicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgcnVFeGFtcGxlID0gcnVEb2MuY3JlYXRlRWwoJ3ByZScpO1xyXG4gICAgICAgIHJ1RXhhbXBsZS5zdHlsZS5jc3NUZXh0ID0gJ2JhY2tncm91bmQ6IHZhcigtLWJhY2tncm91bmQtc2Vjb25kYXJ5KTsgcGFkZGluZzogMTBweDsgYm9yZGVyLXJhZGl1czogNXB4OyBvdmVyZmxvdy14OiBhdXRvOyc7XHJcbiAgICAgICAgcnVFeGFtcGxlLmNyZWF0ZUVsKCdjb2RlJykuaW5uZXJUZXh0ID0gYFxcYFxcYFxcYGdhbGxlcnlcclxuIVtbXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1MS5qcGddXVxyXG4hW1tcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUyLnBuZ3xcdTA0MURcdTA0MzVcdTA0M0VcdTA0MzFcdTA0NEZcdTA0MzdcdTA0MzBcdTA0NDJcdTA0MzVcdTA0M0JcdTA0NENcdTA0M0RcdTA0MzBcdTA0NEYgXHUwNDNGXHUwNDNFXHUwNDM0XHUwNDNGXHUwNDM4XHUwNDQxXHUwNDRDXV1cclxuIVtbXHUwNDQ0XHUwNDNFXHUwNDQyXHUwNDNFMy5qcGddXVxyXG4hW1tcdTA0NDFcdTA0M0FcdTA0NDBcdTA0MzhcdTA0M0RcdTA0NDhcdTA0M0VcdTA0NDIucG5nfFx1MDQxNVx1MDQ0OVx1MDQzNSBcdTA0M0VcdTA0MzRcdTA0M0RcdTA0M0UgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQ0MSBcdTA0M0ZcdTA0M0VcdTA0MzRcdTA0M0ZcdTA0MzhcdTA0NDFcdTA0NENcdTA0NEVdXVxyXG5cXGBcXGBcXGBgO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJ1RG9jLmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiAnXHUwNDEyXHUwNDNFXHUwNDM3XHUwNDNDXHUwNDNFXHUwNDM2XHUwNDNEXHUwNDNFXHUwNDQxXHUwNDQyXHUwNDM4IFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzODonIH0pO1xyXG4gICAgICAgIGNvbnN0IHJ1RmVhdHVyZXMgPSBydURvYy5jcmVhdGVFbCgndWwnKTtcclxuICAgICAgICBydUZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdcdTA0MUFcdTA0M0JcdTA0MzhcdTA0M0FcdTA0M0RcdTA0MzhcdTA0NDJcdTA0MzUgXHUwNDNEXHUwNDMwIFx1MDQzQlx1MDQ0RVx1MDQzMVx1MDQ0M1x1MDQ0RSBcdTA0M0NcdTA0MzhcdTA0M0RcdTA0MzhcdTA0MzBcdTA0NDJcdTA0NEVcdTA0NDBcdTA0NDMgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzRVx1MDQ0Mlx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQ0Mlx1MDQzOFx1MDQ0RiBcdTA0M0JcdTA0MzBcdTA0MzlcdTA0NDJcdTA0MzFcdTA0M0VcdTA0M0FcdTA0NDFcdTA0MzAnO1xyXG4gICAgICAgIHJ1RmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1x1MDQxRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQ0OVx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzNVx1MDQ0MVx1MDQ0QyBcdTA0M0NcdTA0MzVcdTA0MzZcdTA0MzRcdTA0NDMgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHUwNDNDXHUwNDM4IFx1MDQ0MSBcdTA0M0ZcdTA0M0VcdTA0M0NcdTA0M0VcdTA0NDlcdTA0NENcdTA0NEUgXHUwNDNBXHUwNDNCXHUwNDMwXHUwNDMyXHUwNDM4XHUwNDQ4LVx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzNVx1MDQzQlx1MDQzRVx1MDQzQSBcdTA0MzhcdTA0M0JcdTA0MzggXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHUwNDMwJztcclxuICAgICAgICBydUZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdcdTA0MjNcdTA0MzJcdTA0MzVcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzhcdTA0MzJcdTA0MzBcdTA0MzlcdTA0NDJcdTA0MzUgXHUwNDQxIFx1MDQzRlx1MDQzRVx1MDQzQ1x1MDQzRVx1MDQ0OVx1MDQ0Q1x1MDQ0RSBcdTA0M0FcdTA0M0VcdTA0M0JcdTA0MzVcdTA0NDFcdTA0MzhcdTA0M0FcdTA0MzAgXHUwNDNDXHUwNDRCXHUwNDQ4XHUwNDM4LCBcdTA0MzZcdTA0MzVcdTA0NDFcdTA0NDJcdTA0MzAgcGluY2gnO1xyXG4gICAgICAgIHJ1RmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1x1MDQxRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQ0OVx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzNSBcdTA0NDNcdTA0MzJcdTA0MzVcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzVcdTA0M0RcdTA0M0RcdTA0M0VcdTA0MzUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0Mlx1MDQzMFx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQzNVx1MDQzQyc7XHJcbiAgICAgICAgcnVGZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnXHUwNDE0XHUwNDMyXHUwNDNFXHUwNDM5XHUwNDNEXHUwNDNFXHUwNDM5IFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQS9cdTA0NDJcdTA0MzBcdTA0M0YgXHUwNDQxXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDQxXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDQyIFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMSc7XHJcbiAgICAgICAgcnVGZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnXHUwNDFEXHUwNDMwXHUwNDM2XHUwNDNDXHUwNDM4XHUwNDQyXHUwNDM1IEVzY2FwZSBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDM3XHUwNDMwXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDQyXHUwNDM4XHUwNDRGIFx1MDQzQlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzMVx1MDQzRVx1MDQzQVx1MDQ0MVx1MDQzMCBcdTA0MzhcdTA0M0JcdTA0MzggXHUwNDNEXHUwNDMwIFx1MDQzRVx1MDQ0MFx1MDQzOFx1MDQzM1x1MDQzOFx1MDQzRFx1MDQzMFx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQzRVx1MDQzQyBcdTA0M0NcdTA0MzBcdTA0NDFcdTA0NDhcdTA0NDJcdTA0MzBcdTA0MzFcdTA0MzUgXHUwNDNEXHUwNDMwXHUwNDM2XHUwNDMwXHUwNDQyXHUwNDM4XHUwNDM1XHUwNDNDIFx1MDQzRFx1MDQzMCBcdTA0NDRcdTA0M0VcdTA0NDJcdTA0M0UnO1xyXG4gICAgICAgIHJ1RmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1x1MDQxNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0M0NcdTA0MzBcdTA0NDFcdTA0NDhcdTA0NDJcdTA0MzBcdTA0MzEgXHUwNDQ0XHUwNDNFXHUwNDQyXHUwNDNFIFx1MDQ0M1x1MDQzMlx1MDQzNVx1MDQzQlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQzRCBcdTA0M0JcdTA0MzBcdTA0MzlcdTA0NDJcdTA0MzFcdTA0M0VcdTA0M0FcdTA0NDEgXHUwNDNEXHUwNDM1IFx1MDQzN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQzRVx1MDQzNVx1MDQ0Mlx1MDQ0MVx1MDQ0RiBcdTA0M0RcdTA0MzBcdTA0MzZcdTA0MzBcdTA0NDJcdTA0MzhcdTA0MzVcdTA0M0MgXHUwNDNEXHUwNDMwIFx1MDQzQVx1MDQzMFx1MDQ0MFx1MDQ0Mlx1MDQzOFx1MDQzRFx1MDQzQVx1MDQ0My4gXHUwNDIxXHUwNDMxXHUwNDQwXHUwNDNFXHUwNDQxXHUwNDRDXHUwNDQyXHUwNDM1IFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMSBcdTA0MzRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0NEJcdTA0M0MgXHUwNDNEXHUwNDMwXHUwNDM2XHUwNDMwXHUwNDQyXHUwNDM4XHUwNDM1XHUwNDNDJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBBZGQgc29tZSBzdHlsaW5nIGZvciB0aGUgZG9jdW1lbnRhdGlvblxyXG4gICAgICAgIGNvbnN0IHN0eWxlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3R5bGUnKTtcclxuICAgICAgICBzdHlsZS50ZXh0Q29udGVudCA9IGBcclxuICAgICAgICAgICAgLmdhbGxlcnktZG9jLXNlY3Rpb24ge1xyXG4gICAgICAgICAgICAgICAgbWFyZ2luLXRvcDogMjBweDtcclxuICAgICAgICAgICAgICAgIHBhZGRpbmc6IDE1cHg7XHJcbiAgICAgICAgICAgICAgICBiYWNrZ3JvdW5kOiB2YXIoLS1iYWNrZ3JvdW5kLXByaW1hcnkpO1xyXG4gICAgICAgICAgICAgICAgYm9yZGVyLXJhZGl1czogOHB4O1xyXG4gICAgICAgICAgICAgICAgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiBoNCB7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW4tdG9wOiAwO1xyXG4gICAgICAgICAgICAgICAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKTtcclxuICAgICAgICAgICAgICAgIHBhZGRpbmctYm90dG9tOiA4cHg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC5nYWxsZXJ5LWRvYy1zZWN0aW9uIHVsIHtcclxuICAgICAgICAgICAgICAgIHBhZGRpbmctbGVmdDogMjBweDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLmdhbGxlcnktZG9jLXNlY3Rpb24gbGkge1xyXG4gICAgICAgICAgICAgICAgbWFyZ2luLWJvdHRvbTogNXB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiBwcmUge1xyXG4gICAgICAgICAgICAgICAgbWFyZ2luOiAxMHB4IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC5nYWxsZXJ5LWRvYy1zZWN0aW9uIGNvZGUge1xyXG4gICAgICAgICAgICAgICAgZm9udC1mYW1pbHk6ICdGaXJhIENvZGUnLCAnQ2FzY2FkaWEgQ29kZScsIG1vbm9zcGFjZTtcclxuICAgICAgICAgICAgICAgIGZvbnQtc2l6ZTogMTRweDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLmdhbGxlcnktZG9jLXNlY3Rpb24gKyAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiB7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW4tdG9wOiAzMHB4O1xyXG4gICAgICAgICAgICAgICAgYm9yZGVyLXRvcDogMnB4IHNvbGlkIHZhcigtLWJhY2tncm91bmQtbW9kaWZpZXItYm9yZGVyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIGA7XHJcbiAgICAgICAgY29udGFpbmVyRWwuYXBwZW5kQ2hpbGQoc3R5bGUpO1xyXG4gICAgfVxyXG59Il0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFBcUY7QUFVckYsSUFBTSxtQkFBb0M7QUFBQSxFQUN0QyxtQkFBbUI7QUFBQSxFQUNuQixrQkFBa0I7QUFBQSxFQUNsQixrQkFBa0I7QUFBQSxFQUNsQixTQUFTO0FBQUEsRUFDVCxnQkFBZ0I7QUFDcEI7QUFFQSxJQUFxQixxQkFBckIsY0FBZ0QsdUJBQU87QUFBQSxFQUF2RDtBQUFBO0FBRUksU0FBUSxZQUFvQjtBQUM1QixTQUFRLGFBQXNCO0FBQzlCLFNBQVEsYUFBcUI7QUFDN0IsU0FBUSxhQUFxQjtBQUM3QixTQUFRLGNBQXNCO0FBQzlCLFNBQVEsY0FBc0I7QUFFOUIsU0FBUSxpQkFBcUM7QUFDN0MsU0FBUSxhQUFrRDtBQUcxRDtBQUFBO0FBQUEsU0FBUSxjQUFzQjtBQUM5QixTQUFRLGNBQXNCO0FBQzlCLFNBQVEsaUJBQXlCO0FBQ2pDLFNBQVEsWUFBcUI7QUFBQTtBQUFBLEVBRTdCLE1BQU0sU0FBUztBQUNYLFlBQVEsSUFBSSw4QkFBOEI7QUFFMUMsVUFBTSxLQUFLLGFBQWE7QUFHeEIsU0FBSyxXQUFXO0FBR2hCLFNBQUssaUJBQWlCO0FBR3RCLFNBQUssbUNBQW1DLEtBQUssU0FBUyxnQkFBZ0IsT0FBTyxRQUFRLElBQUksUUFBUTtBQUM3RixZQUFNLEtBQUssY0FBYyxRQUFRLElBQUksR0FBRztBQUFBLElBQzVDLENBQUM7QUFHRCxTQUFLLHNCQUFzQjtBQUczQixTQUFLLGNBQWMsSUFBSSxrQkFBa0IsS0FBSyxLQUFLLElBQUksQ0FBQztBQUFBLEVBQzVEO0FBQUEsRUFFQSxhQUFhO0FBRVQsVUFBTSxnQkFBZ0IsU0FBUyxjQUFjLE9BQU87QUFDcEQsa0JBQWMsS0FBSztBQUNuQixhQUFTLEtBQUssWUFBWSxhQUFhO0FBQUEsRUFFM0M7QUFBQSxFQUVBLG1CQUFtQjtBQUVmLFFBQUksS0FBSyxTQUFTO0FBQ2QsV0FBSyxRQUFRLE9BQU87QUFBQSxJQUN4QjtBQUVBLFNBQUssVUFBVSxTQUFTLGNBQWMsT0FBTztBQUM3QyxTQUFLLFFBQVEsS0FBSztBQUdsQixTQUFLLG9CQUFvQjtBQUV6QixhQUFTLEtBQUssWUFBWSxLQUFLLE9BQU87QUFBQSxFQUMxQztBQUFBLEVBRUEsc0JBQXNCO0FBQ2xCLFVBQU0sYUFBYTtBQUFBO0FBQUEsdUJBRUosS0FBSyxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0ZBT2lELEtBQUssU0FBUyx5Q0FBeUMsS0FBSyxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0ZBT3JFLEtBQUssU0FBUyx3Q0FBd0MsS0FBSyxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsc0ZBT3BFLEtBQUssU0FBUyx3Q0FBd0MsS0FBSyxTQUFTO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBaUJsSixTQUFLLFFBQVEsY0FBYztBQUFBLEVBQy9CO0FBQUEsRUFFQSxNQUFNLGNBQWMsUUFBZ0IsSUFBaUIsS0FBbUM7QUFFcEYsT0FBRyxNQUFNO0FBR1QsVUFBTSxtQkFBbUIsR0FBRyxVQUFVLEVBQUUsS0FBSyxvQkFBb0IsQ0FBQztBQUdsRSxVQUFNLGFBQWE7QUFDbkIsVUFBTSxlQUFlLE9BQU8sTUFBTSxVQUFVLEtBQUssQ0FBQztBQUVsRCxRQUFJLGFBQWEsV0FBVyxHQUFHO0FBQzNCLHVCQUFpQixRQUFRLG1DQUFtQztBQUM1RDtBQUFBLElBQ0o7QUFHQSxVQUFNLE9BQU8saUJBQWlCLFVBQVUsRUFBRSxLQUFLLGVBQWUsQ0FBQztBQUcvRCxTQUFLLE1BQU0sWUFBWSxpQkFBaUIsYUFBYSxPQUFPLFNBQVMsQ0FBQztBQUd0RSxVQUFNLFNBQTRDLENBQUM7QUFFbkQsZUFBVyxTQUFTLGNBQWM7QUFDOUIsWUFBTSxZQUFZLE1BQU0sTUFBTSw0QkFBNEI7QUFDMUQsVUFBSSxDQUFDO0FBQVc7QUFFaEIsWUFBTSxXQUFXLFVBQVUsQ0FBQztBQUM1QixZQUFNLFVBQVUsVUFBVSxDQUFDLEtBQUssU0FBUyxNQUFNLEdBQUcsRUFBRSxJQUFJLEtBQUs7QUFFN0QsVUFBSTtBQUVBLGNBQU0sT0FBTyxLQUFLLElBQUksY0FBYyxxQkFBcUIsVUFBVSxJQUFJLFVBQVU7QUFDakYsWUFBSSxDQUFDO0FBQU07QUFHWCxjQUFNLGVBQWUsS0FBSyxJQUFJLE1BQU0sZ0JBQWdCLElBQUk7QUFHeEQsY0FBTSxlQUFlLEtBQUssVUFBVSxFQUFFLEtBQUssZUFBZSxDQUFDO0FBQzNELHFCQUFhLGFBQWEsWUFBWSxZQUFZO0FBQ2xELHFCQUFhLGFBQWEsWUFBWSxPQUFPO0FBQzdDLHFCQUFhLGFBQWEsY0FBYyxPQUFPLE9BQU8sU0FBUyxDQUFDO0FBRWhFLGNBQU0sTUFBTSxhQUFhLFNBQVMsT0FBTztBQUFBLFVBQ3JDLE1BQU07QUFBQSxZQUNGLEtBQUs7QUFBQSxZQUNMLEtBQUs7QUFBQSxZQUNMLFNBQVM7QUFBQSxVQUNiO0FBQUEsUUFDSixDQUFDO0FBR0QscUJBQWEsaUJBQWlCLFNBQVMsQ0FBQyxNQUFNO0FBQzFDLGNBQUksRUFBRSxXQUFXLEdBQUc7QUFDaEIsY0FBRSxlQUFlO0FBQ2pCLGNBQUUsZ0JBQWdCO0FBR2xCLGtCQUFNLGdCQUFnQixNQUFNLEtBQUssS0FBSyxpQkFBaUIsZUFBZSxDQUFDLEVBQ2xFLElBQUksV0FBUztBQUFBLGNBQ1YsS0FBSyxLQUFLLGFBQWEsVUFBVSxLQUFLO0FBQUEsY0FDdEMsS0FBSyxLQUFLLGFBQWEsVUFBVSxLQUFLO0FBQUEsWUFDMUMsRUFBRTtBQUVOLGtCQUFNLFFBQVEsU0FBUyxhQUFhLGFBQWEsWUFBWSxLQUFLLEdBQUc7QUFDckUsaUJBQUssYUFBYSxlQUFlLEtBQUs7QUFBQSxVQUMxQztBQUFBLFFBQ0osQ0FBQztBQUVELGVBQU8sS0FBSztBQUFBLFVBQ1IsS0FBSztBQUFBLFVBQ0wsS0FBSztBQUFBLFFBQ1QsQ0FBQztBQUFBLE1BRUwsU0FBUyxPQUFQO0FBQ0UsZ0JBQVEsTUFBTSx3QkFBd0IsS0FBSztBQUFBLE1BQy9DO0FBQUEsSUFDSjtBQUFBLEVBQ0o7QUFBQSxFQUVBLGFBQWEsUUFBMkMsWUFBb0I7QUFFeEUsUUFBSSxLQUFLLGdCQUFnQjtBQUNyQixXQUFLLGNBQWM7QUFBQSxJQUN2QjtBQUdBLFVBQU0sV0FBVyxTQUFTLGNBQWMsS0FBSztBQUM3QyxhQUFTLFlBQVk7QUFDckIsU0FBSyxpQkFBaUI7QUFHdEIsVUFBTSxpQkFBaUIsU0FBUyxjQUFjLEtBQUs7QUFDbkQsbUJBQWUsWUFBWTtBQUczQixVQUFNLE1BQU0sU0FBUyxjQUFjLEtBQUs7QUFDeEMsUUFBSSxZQUFZO0FBR2hCLFVBQU0sVUFBVSxLQUFLLGFBQWEsVUFBSyxnQkFBZ0I7QUFDdkQsVUFBTSxVQUFVLEtBQUssYUFBYSxVQUFLLGdCQUFnQjtBQUN2RCxVQUFNLFVBQVUsU0FBUyxjQUFjLEtBQUs7QUFDNUMsWUFBUSxZQUFZO0FBZXBCLFFBQUksc0JBQTBDO0FBQzlDLFVBQU0sU0FBNkIsQ0FBQztBQUVwQyxRQUFJLE9BQU8sU0FBUyxHQUFHO0FBQ25CLDRCQUFzQixTQUFTLGNBQWMsS0FBSztBQUNsRCwwQkFBb0IsWUFBWTtBQUVoQyxhQUFPLFFBQVEsQ0FBQyxPQUFPLFVBQVU7QUFDN0IsY0FBTSxRQUFRLFNBQVMsY0FBYyxLQUFLO0FBQzFDLGNBQU0sWUFBWTtBQUNsQixjQUFNLE1BQU0sTUFBTTtBQUNsQixjQUFNLGFBQWEsY0FBYyxNQUFNLFNBQVMsQ0FBQztBQUNqRCxjQUFNLE1BQU0sTUFBTTtBQUNsQixjQUFNLGlCQUFpQixTQUFTLENBQUMsTUFBTTtBQUNuQyxZQUFFLGdCQUFnQjtBQUNsQixlQUFLLG9CQUFvQixRQUFRLE9BQU8sS0FBSyxTQUFTLE1BQU07QUFDNUQseUJBQWU7QUFDZixlQUFLLHFCQUFxQjtBQUFBLFFBQzlCLENBQUM7QUFDRCw0QkFBcUIsWUFBWSxLQUFLO0FBQ3RDLGVBQU8sS0FBSyxLQUFLO0FBQUEsTUFDckIsQ0FBQztBQUFBLElBQ0w7QUFHQSxhQUFTLFlBQVksY0FBYztBQUNuQyxtQkFBZSxZQUFZLEdBQUc7QUFHOUIsUUFBSSxPQUFPLFNBQVMsR0FBRztBQUNuQixlQUFTLFlBQVksT0FBTztBQUM1QixlQUFTLFlBQVksT0FBTztBQUM1QixlQUFTLFlBQVksbUJBQW9CO0FBQUEsSUFDN0MsT0FBTztBQUVILGNBQVEsTUFBTSxVQUFVO0FBQUEsSUFDNUI7QUFFQSxhQUFTLFlBQVksT0FBTztBQUk1QixhQUFTLEtBQUssWUFBWSxRQUFRO0FBR2xDLGFBQVMsS0FBSyxNQUFNLFdBQVc7QUFHL0IsUUFBSSxlQUFlO0FBQ25CLFNBQUssWUFBWTtBQUNqQixTQUFLLGFBQWE7QUFDbEIsU0FBSyxjQUFjO0FBQ25CLFNBQUssY0FBYztBQUNuQixTQUFLLFlBQVk7QUFHakIsVUFBTSxjQUFjLE1BQU07QUFDdEIsVUFBSSxNQUFNLE9BQU8sWUFBWSxFQUFFO0FBQy9CLFVBQUksTUFBTSxPQUFPLFlBQVksRUFBRTtBQUcvQixVQUFJLE1BQU0sWUFBWSxhQUFhLEtBQUssa0JBQWtCLEtBQUssd0JBQXdCLEtBQUs7QUFHNUYsY0FBUSxjQUFjLEdBQUcsZUFBZSxPQUFPLE9BQU87QUFHdEQsYUFBTyxRQUFRLENBQUMsT0FBTyxVQUFVO0FBQzdCLGNBQU0sVUFBVSxPQUFPLFVBQVUsVUFBVSxZQUFZO0FBQUEsTUFDM0QsQ0FBQztBQUdELFVBQUksT0FBTyxZQUFZLEdBQUc7QUFDdEIsZUFBTyxZQUFZLEVBQUUsZUFBZTtBQUFBLFVBQ2hDLFVBQVU7QUFBQSxVQUNWLE9BQU87QUFBQSxVQUNQLFFBQVE7QUFBQSxRQUNaLENBQUM7QUFBQSxNQUNMO0FBQUEsSUFDSjtBQUdBLFVBQU0sY0FBYyxDQUFDLGNBQStCO0FBQ2hELFVBQUksT0FBTyxTQUFTLEdBQUc7QUFDbkIsWUFBSSxjQUFjLFFBQVE7QUFDdEIsMEJBQWdCLGVBQWUsS0FBSyxPQUFPO0FBQUEsUUFDL0MsT0FBTztBQUNILDBCQUFnQixlQUFlLElBQUksT0FBTyxVQUFVLE9BQU87QUFBQSxRQUMvRDtBQUNBLGFBQUsscUJBQXFCO0FBQzFCLG9CQUFZO0FBQUEsTUFDaEI7QUFBQSxJQUNKO0FBR0EsVUFBTSxnQkFBZ0IsTUFBTTtBQUN4QixXQUFLLGNBQWM7QUFBQSxJQUN2QjtBQUdBLFFBQUksT0FBTyxTQUFTLEdBQUc7QUFDbkIsY0FBUSxpQkFBaUIsU0FBUyxDQUFDLE1BQU07QUFDckMsVUFBRSxnQkFBZ0I7QUFDbEIsb0JBQVksTUFBTTtBQUFBLE1BQ3RCLENBQUM7QUFFRCxjQUFRLGlCQUFpQixTQUFTLENBQUMsTUFBTTtBQUNyQyxVQUFFLGdCQUFnQjtBQUNsQixvQkFBWSxNQUFNO0FBQUEsTUFDdEIsQ0FBQztBQUFBLElBQ0w7QUFtQkEsUUFBSSxjQUFjO0FBRWxCLFVBQU0sa0JBQWtCLENBQUMsTUFBK0I7QUFDcEQsUUFBRSxlQUFlO0FBQ2pCLFFBQUUsZ0JBQWdCO0FBR2xCLFVBQUksVUFBVSxJQUFJLFNBQVM7QUFHM0IsV0FBSyxxQkFBcUI7QUFDMUIsVUFBSSxNQUFNLFlBQVk7QUFHdEIsaUJBQVcsTUFBTTtBQUNiLFlBQUksVUFBVSxPQUFPLFNBQVM7QUFBQSxNQUNsQyxHQUFHLEdBQUc7QUFBQSxJQUNWO0FBR0EsbUJBQWUsaUJBQWlCLFlBQVksZUFBZTtBQUczRCxtQkFBZSxpQkFBaUIsY0FBYyxDQUFDLE1BQU07QUFDakQsVUFBSSxFQUFFLFFBQVEsV0FBVyxHQUFHO0FBQ3hCLGNBQU0sZUFBYyxvQkFBSSxLQUFLLEdBQUUsUUFBUTtBQUN2QyxjQUFNLFlBQVksY0FBYztBQUVoQyxZQUFJLFlBQVksT0FBTyxZQUFZLEdBQUc7QUFFbEMsMEJBQWdCLENBQUM7QUFBQSxRQUNyQjtBQUVBLHNCQUFjO0FBQUEsTUFDbEI7QUFBQSxJQUNKLENBQUM7QUFHRCxtQkFBZSxpQkFBaUIsU0FBUyxDQUFDLE1BQU07QUFDNUMsUUFBRSxlQUFlO0FBQ2pCLFFBQUUsZ0JBQWdCO0FBRWxCLFlBQU0sUUFBUSxFQUFFLFNBQVMsSUFBSSxNQUFNO0FBQ25DLFdBQUssWUFBWSxLQUFLLElBQUksS0FBSyxLQUFLLElBQUksS0FBSyxZQUFZLE9BQU8sQ0FBQyxDQUFDO0FBRWxFLFVBQUksTUFBTSxZQUFZLGFBQWEsS0FBSyxrQkFBa0IsS0FBSyx3QkFBd0IsS0FBSztBQUFBLElBQ2hHLEdBQUcsRUFBRSxTQUFTLE1BQU0sQ0FBQztBQUdyQixVQUFNLFlBQVksQ0FBQyxTQUFpQixZQUFvQjtBQUNwRCxVQUFJLEtBQUssWUFBWSxHQUFHO0FBQ3BCLGFBQUssYUFBYTtBQUNsQix1QkFBZSxVQUFVLElBQUksVUFBVTtBQUN2QyxhQUFLLGFBQWEsVUFBVSxLQUFLO0FBQ2pDLGFBQUssYUFBYSxVQUFVLEtBQUs7QUFBQSxNQUNyQztBQUFBLElBQ0o7QUFFQSxVQUFNLFNBQVMsQ0FBQyxTQUFpQixZQUFvQjtBQUNqRCxVQUFJLEtBQUssWUFBWTtBQUNqQixhQUFLLGNBQWMsVUFBVSxLQUFLO0FBQ2xDLGFBQUssY0FBYyxVQUFVLEtBQUs7QUFDbEMsWUFBSSxNQUFNLFlBQVksYUFBYSxLQUFLLGtCQUFrQixLQUFLLHdCQUF3QixLQUFLO0FBQUEsTUFDaEc7QUFBQSxJQUNKO0FBRUEsVUFBTSxVQUFVLE1BQU07QUFDbEIsV0FBSyxhQUFhO0FBQ2xCLHFCQUFlLFVBQVUsT0FBTyxVQUFVO0FBQUEsSUFDOUM7QUFHQSxtQkFBZSxpQkFBaUIsYUFBYSxDQUFDLE1BQU07QUFDaEQsVUFBSSxFQUFFLFdBQVcsR0FBRztBQUNoQixrQkFBVSxFQUFFLFNBQVMsRUFBRSxPQUFPO0FBQUEsTUFDbEM7QUFBQSxJQUNKLENBQUM7QUFFRCxhQUFTLGlCQUFpQixhQUFhLENBQUMsTUFBTTtBQUMxQyxhQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU87QUFBQSxJQUMvQixDQUFDO0FBRUQsYUFBUyxpQkFBaUIsV0FBVyxPQUFPO0FBRzVDLFFBQUksa0JBQWlDO0FBQ3JDLFFBQUksaUJBQW1DO0FBQ3ZDLFFBQUksYUFBYTtBQUVqQixtQkFBZSxpQkFBaUIsY0FBYyxDQUFDLE1BQU07QUFDakQsVUFBSSxFQUFFLFFBQVEsV0FBVyxHQUFHO0FBRXhCLHFCQUFhO0FBQ2IsMEJBQWtCLEtBQUs7QUFBQSxVQUNuQixFQUFFLFFBQVEsQ0FBQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRTtBQUFBLFVBQ3BDLEVBQUUsUUFBUSxDQUFDLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFO0FBQUEsUUFDeEM7QUFDQSx5QkFBaUIsRUFBRTtBQUNuQixVQUFFLGVBQWU7QUFBQSxNQUNyQixXQUFXLEVBQUUsUUFBUSxXQUFXLEtBQUssS0FBSyxZQUFZLEdBQUc7QUFFckQsa0JBQVUsRUFBRSxRQUFRLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLEVBQUUsT0FBTztBQUFBLE1BQ3hELFdBQVcsRUFBRSxRQUFRLFdBQVcsR0FBRztBQUUvQixhQUFLLGNBQWMsRUFBRSxRQUFRLENBQUMsRUFBRTtBQUNoQyxhQUFLLGNBQWMsRUFBRSxRQUFRLENBQUMsRUFBRTtBQUNoQyxhQUFLLGlCQUFpQixLQUFLLElBQUk7QUFDL0IsYUFBSyxZQUFZO0FBQUEsTUFDckI7QUFBQSxJQUNKLENBQUM7QUFFRCxtQkFBZSxpQkFBaUIsYUFBYSxDQUFDLE1BQU07QUFDaEQsVUFBSSxFQUFFLFFBQVEsV0FBVyxLQUFLLG9CQUFvQixRQUFRLGtCQUFrQixZQUFZO0FBRXBGLGNBQU0sa0JBQWtCLEtBQUs7QUFBQSxVQUN6QixFQUFFLFFBQVEsQ0FBQyxFQUFFLFVBQVUsRUFBRSxRQUFRLENBQUMsRUFBRTtBQUFBLFVBQ3BDLEVBQUUsUUFBUSxDQUFDLEVBQUUsVUFBVSxFQUFFLFFBQVEsQ0FBQyxFQUFFO0FBQUEsUUFDeEM7QUFFQSxjQUFNLFFBQVEsa0JBQWtCO0FBQ2hDLGFBQUssWUFBWSxLQUFLLElBQUksS0FBSyxLQUFLLElBQUksS0FBSyxZQUFZLE9BQU8sQ0FBQyxDQUFDO0FBQ2xFLDBCQUFrQjtBQUVsQixZQUFJLE1BQU0sWUFBWSxhQUFhLEtBQUssa0JBQWtCLEtBQUssd0JBQXdCLEtBQUs7QUFDNUYsVUFBRSxlQUFlO0FBQUEsTUFDckIsV0FBVyxFQUFFLFFBQVEsV0FBVyxLQUFLLEtBQUssWUFBWTtBQUVsRCxlQUFPLEVBQUUsUUFBUSxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsQ0FBQyxFQUFFLE9BQU87QUFBQSxNQUNyRCxXQUFXLEVBQUUsUUFBUSxXQUFXLEtBQUssS0FBSyxjQUFjLEdBQUc7QUFFdkQsY0FBTSxRQUFRLEVBQUUsUUFBUSxDQUFDO0FBQ3pCLGNBQU0sU0FBUyxNQUFNLFVBQVUsS0FBSztBQUNwQyxjQUFNLFNBQVMsTUFBTSxVQUFVLEtBQUs7QUFHcEMsWUFBSSxLQUFLLElBQUksTUFBTSxJQUFJLEtBQUssSUFBSSxNQUFNLEtBQUssS0FBSyxJQUFJLE1BQU0sSUFBSSxJQUFJO0FBQzlELGVBQUssWUFBWTtBQUVqQixjQUFJLE1BQU0sWUFBWSxhQUFhLFNBQVM7QUFDNUMsWUFBRSxlQUFlO0FBQUEsUUFDckI7QUFBQSxNQUNKO0FBQUEsSUFDSixDQUFDO0FBRUQsbUJBQWUsaUJBQWlCLFlBQVksQ0FBQyxNQUFNO0FBQy9DLFVBQUksWUFBWTtBQUNaLHFCQUFhO0FBQ2IsMEJBQWtCO0FBQ2xCLHlCQUFpQjtBQUFBLE1BQ3JCO0FBRUEsY0FBUTtBQUVSLFVBQUksS0FBSyxjQUFjLEtBQUssQ0FBQyxjQUFjLENBQUMsS0FBSyxZQUFZO0FBQ3pELGNBQU0sUUFBUSxFQUFFLGVBQWUsQ0FBQztBQUNoQyxjQUFNLFNBQVMsTUFBTSxVQUFVLEtBQUs7QUFDcEMsY0FBTSxTQUFTLE1BQU0sVUFBVSxLQUFLO0FBQ3BDLGNBQU0sWUFBWSxLQUFLLElBQUksSUFBSSxLQUFLO0FBR3BDLGNBQU0sbUJBQW1CO0FBQ3pCLGNBQU0sZUFBZTtBQUVyQixZQUFJLEtBQUssYUFBYSxLQUFLLElBQUksTUFBTSxJQUFJLG9CQUFvQixZQUFZLGNBQWM7QUFFdkYsY0FBSSxTQUFTLEdBQUc7QUFDWix3QkFBWSxNQUFNO0FBQUEsVUFDdEIsT0FFSztBQUNELHdCQUFZLE1BQU07QUFBQSxVQUN0QjtBQUNBLFlBQUUsZUFBZTtBQUFBLFFBQ3JCO0FBR0ksWUFBSSxNQUFNLFlBQVk7QUFBQSxNQUMxQjtBQUVBLFdBQUssWUFBWTtBQUFBLElBQ3JCLENBQUM7QUFHRCxTQUFLLGFBQWEsQ0FBQyxNQUFxQjtBQUNwQyxVQUFJLEVBQUUsUUFBUSxVQUFVO0FBQ3BCLHNCQUFjO0FBQUEsTUFDbEIsV0FBVyxPQUFPLFNBQVMsR0FBRztBQUMxQixZQUFJLEVBQUUsUUFBUSxhQUFhO0FBQ3ZCLHNCQUFZLE1BQU07QUFBQSxRQUN0QixXQUFXLEVBQUUsUUFBUSxjQUFjO0FBQy9CLHNCQUFZLE1BQU07QUFBQSxRQUN0QjtBQUFBLE1BQ0o7QUFFQSxVQUFJLEVBQUUsUUFBUSxPQUFPLEVBQUUsUUFBUSxLQUFLO0FBQ2hDLFVBQUUsZUFBZTtBQUNqQixhQUFLLFlBQVksS0FBSyxJQUFJLEtBQUssWUFBWSxLQUFLLENBQUM7QUFDakQsWUFBSSxNQUFNLFlBQVksYUFBYSxLQUFLLGtCQUFrQixLQUFLLHdCQUF3QixLQUFLO0FBQUEsTUFDaEcsV0FBVyxFQUFFLFFBQVEsT0FBTyxFQUFFLFFBQVEsS0FBSztBQUN2QyxVQUFFLGVBQWU7QUFDakIsYUFBSyxZQUFZLEtBQUssSUFBSSxLQUFLLFlBQVksS0FBSyxHQUFHO0FBQ25ELFlBQUksTUFBTSxZQUFZLGFBQWEsS0FBSyxrQkFBa0IsS0FBSyx3QkFBd0IsS0FBSztBQUFBLE1BQ2hHLFdBQVcsRUFBRSxRQUFRLEtBQUs7QUFDdEIsVUFBRSxlQUFlO0FBQ2pCLGFBQUsscUJBQXFCO0FBQzFCLFlBQUksTUFBTSxZQUFZO0FBQUEsTUFDMUI7QUFBQSxJQUNKO0FBRUEsYUFBUyxpQkFBaUIsV0FBVyxLQUFLLFVBQVU7QUFHcEQsYUFBUyxpQkFBaUIsU0FBUyxDQUFDLE1BQU07QUFFdEMsWUFBTSxTQUFTLEVBQUU7QUFDakIsVUFBSSxXQUFXLFlBQ1YsV0FBVyxrQkFBa0IsS0FBSyxjQUFjLEtBQ2hELFdBQVcsT0FBTyxLQUFLLGNBQWMsR0FBSTtBQUMxQyxzQkFBYztBQUFBLE1BQ2xCO0FBQUEsSUFDSixDQUFDO0FBR0QsZUFBVyxNQUFNLFNBQVMsVUFBVSxJQUFJLElBQUksR0FBRyxFQUFFO0FBR2pELFNBQUssb0JBQW9CLFFBQVEsWUFBWSxLQUFLLFNBQVMsTUFBTTtBQUFBLEVBQ3JFO0FBQUEsRUFFUSxnQkFBZ0I7QUFDcEIsUUFBSSxLQUFLLGdCQUFnQjtBQUVyQixVQUFJLEtBQUssWUFBWTtBQUNqQixpQkFBUyxvQkFBb0IsV0FBVyxLQUFLLFVBQVU7QUFDdkQsYUFBSyxhQUFhO0FBQUEsTUFDdEI7QUFFQSxlQUFTLEtBQUssWUFBWSxLQUFLLGNBQWM7QUFDN0MsV0FBSyxpQkFBaUI7QUFDdEIsZUFBUyxLQUFLLE1BQU0sV0FBVztBQUFBLElBQ25DO0FBQUEsRUFDSjtBQUFBLEVBRVEsYUFBYSxNQUFjLFdBQXNDO0FBQ3JFLFVBQU0sTUFBTSxTQUFTLGNBQWMsUUFBUTtBQUMzQyxRQUFJLFlBQVk7QUFDaEIsUUFBSSxZQUFZO0FBQ2hCLFdBQU87QUFBQSxFQUNYO0FBQUEsRUFFUSxvQkFDSixRQUNBLE9BQ0EsS0FDQSxTQUNBLFFBQ0Y7QUFDRSxRQUFJLE1BQU0sT0FBTyxLQUFLLEVBQUU7QUFDeEIsUUFBSSxNQUFNLE9BQU8sS0FBSyxFQUFFO0FBR3hCLFNBQUsscUJBQXFCO0FBQzFCLFFBQUksTUFBTSxZQUFZO0FBR3RCLFlBQVEsY0FBYyxHQUFHLFFBQVEsT0FBTyxPQUFPO0FBRy9DLFdBQU8sUUFBUSxDQUFDLE9BQU8sTUFBTTtBQUN6QixZQUFNLFVBQVUsT0FBTyxVQUFVLE1BQU0sS0FBSztBQUFBLElBQ2hELENBQUM7QUFBQSxFQUNMO0FBQUEsRUFFUSx1QkFBdUI7QUFDM0IsU0FBSyxZQUFZO0FBQ2pCLFNBQUssY0FBYztBQUNuQixTQUFLLGNBQWM7QUFBQSxFQUN2QjtBQUFBLEVBRVEsd0JBQXdCO0FBRTVCLFNBQUssaUJBQWlCLFVBQVUsU0FBUyxDQUFDLE1BQWtCO0FBQ3hELFlBQU0sU0FBUyxFQUFFO0FBR2pCLFVBQUksT0FBTyxRQUFRLGNBQWMsS0FDN0IsT0FBTyxRQUFRLFNBQVMsS0FDeEIsT0FBTyxRQUFRLGVBQWUsS0FDOUIsT0FBTyxRQUFRLG1CQUFtQixHQUFHO0FBQ3JDO0FBQUEsTUFDSjtBQUdBLFVBQUksT0FBTyxRQUFRLGVBQWUsR0FBRztBQUNqQztBQUFBLE1BQ0o7QUFHQSxVQUFJLGFBQXNDO0FBRTFDLFVBQUksT0FBTyxZQUFZLE9BQU87QUFDMUIscUJBQWE7QUFBQSxNQUNqQixXQUFXLE9BQU8sVUFBVSxTQUFTLGdCQUFnQixHQUFHO0FBRXBELHFCQUFhLE9BQU8sY0FBYyxLQUFLO0FBQUEsTUFDM0M7QUFFQSxVQUFJLENBQUMsWUFBWTtBQUNiO0FBQUEsTUFDSjtBQUdBLFlBQU0sY0FBYyxXQUFXLFFBQVEsK0NBQStDO0FBQ3RGLFVBQUksQ0FBQyxhQUFhO0FBQ2Q7QUFBQSxNQUNKO0FBR0EsWUFBTSxNQUFNLFdBQVcsYUFBYSxLQUFLO0FBQ3pDLFlBQU0sTUFBTSxXQUFXLGFBQWEsS0FBSyxLQUFLO0FBRzlDLFVBQUksT0FBTyxDQUFDLElBQUksV0FBVyxPQUFPLEtBQUssQ0FBQyxJQUFJLFNBQVMsU0FBUyxLQUFLLENBQUMsSUFBSSxTQUFTLFVBQVUsR0FBRztBQUUxRixVQUFFLGVBQWU7QUFDakIsVUFBRSxnQkFBZ0I7QUFDbEIsYUFBSyxhQUFhLENBQUMsRUFBRSxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUM7QUFBQSxNQUN2QztBQUFBLElBQ0osQ0FBQztBQUdELFNBQUssOEJBQThCLENBQUMsWUFBWTtBQUM1QyxZQUFNLFNBQVMsUUFBUSxpQkFBaUIsNEJBQTRCO0FBRXBFLGFBQU8sUUFBUSxDQUFDLFFBQVE7QUFFcEIsWUFBSSxNQUFNLFNBQVM7QUFHbkIsWUFBSSxpQkFBaUIsU0FBUyxDQUFDLE1BQU07QUFDakMsWUFBRSxlQUFlO0FBQ2pCLFlBQUUsZ0JBQWdCO0FBRWxCLGdCQUFNLE1BQU0sSUFBSSxhQUFhLEtBQUs7QUFDbEMsZ0JBQU0sTUFBTSxJQUFJLGFBQWEsS0FBSyxLQUFLO0FBRXZDLGNBQUksT0FBTyxDQUFDLElBQUksV0FBVyxPQUFPLEdBQUc7QUFDakMsaUJBQUssYUFBYSxDQUFDLEVBQUUsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDO0FBQUEsVUFDdkM7QUFBQSxRQUNKLENBQUM7QUFBQSxNQUNMLENBQUM7QUFBQSxJQUNMLENBQUM7QUFBQSxFQUNMO0FBQUEsRUFFQSxNQUFNLGVBQWU7QUFDakIsU0FBSyxXQUFXLE9BQU8sT0FBTyxDQUFDLEdBQUcsa0JBQWtCLE1BQU0sS0FBSyxTQUFTLENBQUM7QUFBQSxFQUM3RTtBQUFBLEVBRUEsTUFBTSxlQUFlO0FBQ2pCLFVBQU0sS0FBSyxTQUFTLEtBQUssUUFBUTtBQUNqQyxTQUFLLG9CQUFvQjtBQUd6QixTQUFLLElBQUksVUFBVSxJQUFJLGFBQWEsTUFBTTtBQUFBLElBQUMsQ0FBQztBQUM1QyxTQUFLLG1DQUFtQyxLQUFLLFNBQVMsZ0JBQWdCLE9BQU8sUUFBUSxJQUFJLFFBQVE7QUFDN0YsWUFBTSxLQUFLLGNBQWMsUUFBUSxJQUFJLEdBQUc7QUFBQSxJQUM1QyxDQUFDO0FBRUQsU0FBSyxvQkFBb0I7QUFBQSxFQUM3QjtBQUFBLEVBRUEsc0JBQXNCO0FBQ2xCLFVBQU0sb0JBQW9CLFNBQVMsaUJBQWlCLG9CQUFvQjtBQUN4RSxzQkFBa0IsUUFBUSxlQUFhO0FBQ25DLFlBQU0sT0FBTyxVQUFVLGNBQWMsZUFBZTtBQUNwRCxVQUFJLE1BQU07QUFDTixjQUFNLFFBQVEsS0FBSyxpQkFBaUIsZUFBZTtBQUNuRCxhQUFLLE1BQU0sWUFBWSxpQkFBaUIsTUFBTSxPQUFPLFNBQVMsQ0FBQztBQUFBLE1BQ25FO0FBQUEsSUFDSixDQUFDO0FBQUEsRUFDTDtBQUFBLEVBRUEsV0FBVztBQUNQLFlBQVEsSUFBSSxnQ0FBZ0M7QUFHNUMsVUFBTSxnQkFBZ0IsU0FBUyxlQUFlLGdDQUFnQztBQUM5RSxRQUFJLGVBQWU7QUFDZixvQkFBYyxPQUFPO0FBQUEsSUFDekI7QUFFQSxRQUFJLEtBQUssU0FBUztBQUNkLFdBQUssUUFBUSxPQUFPO0FBQUEsSUFDeEI7QUFFQSxTQUFLLGNBQWM7QUFBQSxFQUN2QjtBQUNKO0FBRUEsSUFBTSxvQkFBTixjQUFnQyxpQ0FBaUI7QUFBQSxFQUc3QyxZQUFZLEtBQVUsUUFBNEI7QUFDOUMsVUFBTSxLQUFLLE1BQU07QUFDakIsU0FBSyxTQUFTO0FBQUEsRUFDbEI7QUFBQSxFQUVBLFVBQWdCO0FBQ1osVUFBTSxFQUFFLFlBQVksSUFBSTtBQUN4QixnQkFBWSxNQUFNO0FBRWxCLGdCQUFZLFNBQVMsTUFBTSxFQUFFLE1BQU0sd0JBQXdCLENBQUM7QUFFNUQsVUFBTSxXQUFZLEtBQUssT0FBZTtBQUN0QyxRQUFJLFlBQVksU0FBUyxTQUFTO0FBQzlCLGtCQUFZLFNBQVMsS0FBSztBQUFBLFFBQ3RCLE1BQU0sd0NBQXdDLFNBQVM7QUFBQSxRQUN2RCxLQUFLO0FBQUEsTUFDVCxDQUFDO0FBQUEsSUFDTDtBQUVBLFFBQUksd0JBQVEsV0FBVyxFQUNsQixRQUFRLHFPQUEyRCxFQUNuRSxRQUFRLG1FQUFtRSxFQUMzRSxRQUFRLFVBQVEsS0FDWixlQUFlLFNBQVMsRUFDeEIsU0FBUyxLQUFLLE9BQU8sU0FBUyxjQUFjLEVBQzVDLFNBQVMsT0FBTyxVQUFVO0FBQ3ZCLFdBQUssT0FBTyxTQUFTLGlCQUFpQjtBQUN0QyxZQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsSUFDbkMsQ0FBQyxDQUFDO0FBRVYsZ0JBQVksU0FBUyxNQUFNLEVBQUUsTUFBTSxzTUFBMEQsQ0FBQztBQUM5RixRQUFJLHdCQUFRLFdBQVcsRUFDbEIsUUFBUSxTQUFTLEVBQ2pCLFFBQVEsNkdBQXdHLEVBQ2hILFVBQVUsWUFBVSxPQUNoQixVQUFVLEdBQUcsR0FBRyxDQUFDLEVBQ2pCLFNBQVMsS0FBSyxPQUFPLFNBQVMsaUJBQWlCLEVBQy9DLGtCQUFrQixFQUNsQixTQUFTLE9BQU8sVUFBVTtBQUN2QixXQUFLLE9BQU8sU0FBUyxvQkFBb0I7QUFDekMsWUFBTSxLQUFLLE9BQU8sYUFBYTtBQUFBLElBQ25DLENBQUMsQ0FBQztBQUVWLFFBQUksd0JBQVEsV0FBVyxFQUNsQixRQUFRLFFBQVEsRUFDaEIsUUFBUSw0REFBNEQsRUFDcEUsVUFBVSxZQUFVLE9BQ2hCLFVBQVUsR0FBRyxHQUFHLENBQUMsRUFDakIsU0FBUyxLQUFLLE9BQU8sU0FBUyxnQkFBZ0IsRUFDOUMsa0JBQWtCLEVBQ2xCLFNBQVMsT0FBTyxVQUFVO0FBQ3ZCLFdBQUssT0FBTyxTQUFTLG1CQUFtQjtBQUN4QyxZQUFNLEtBQUssT0FBTyxhQUFhO0FBQUEsSUFDbkMsQ0FBQyxDQUFDO0FBRVYsUUFBSSx3QkFBUSxXQUFXLEVBQ2xCLFFBQVEsUUFBUSxFQUNoQixRQUFRLHFEQUFxRCxFQUM3RCxVQUFVLFlBQVUsT0FDaEIsVUFBVSxHQUFHLEdBQUcsQ0FBQyxFQUNqQixTQUFTLEtBQUssT0FBTyxTQUFTLGdCQUFnQixFQUM5QyxrQkFBa0IsRUFDbEIsU0FBUyxPQUFPLFVBQVU7QUFDdkIsV0FBSyxPQUFPLFNBQVMsbUJBQW1CO0FBQ3hDLFlBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxJQUNuQyxDQUFDLENBQUM7QUFFVixRQUFJLHdCQUFRLFdBQVcsRUFDbEIsUUFBUSw2SkFBK0MsRUFDdkQsUUFBUSw2Q0FBNkMsRUFDckQsUUFBUSxVQUFRLEtBQ1osZUFBZSxNQUFNLEVBQ3JCLFNBQVMsS0FBSyxPQUFPLFNBQVMsT0FBTyxFQUNyQyxTQUFTLE9BQU8sVUFBVTtBQUN2QixXQUFLLE9BQU8sU0FBUyxVQUFVO0FBQy9CLFlBQU0sS0FBSyxPQUFPLGFBQWE7QUFBQSxJQUNuQyxDQUFDLENBQUM7QUFHVixnQkFBWSxTQUFTLE1BQU0sRUFBRSxNQUFNLDJGQUErQixDQUFDO0FBRW5FLFVBQU0sZUFBZSxZQUFZLFVBQVUsRUFBRSxLQUFLLHdCQUF3QixDQUFDO0FBRzNFLFVBQU0sUUFBUSxhQUFhLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixDQUFDO0FBQ25FLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSwwQ0FBbUMsQ0FBQztBQUVqRSxVQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sK0NBQStDLENBQUM7QUFFNUUsVUFBTSxTQUFTLE1BQU0sU0FBUyxJQUFJO0FBQ2xDLFdBQU8sU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUNsQyxXQUFPLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFFbEMsVUFBTSxTQUFTLEtBQUssRUFBRSxNQUFNLG1FQUFtRSxDQUFDO0FBRWhHLFVBQU0sWUFBWSxNQUFNLFNBQVMsS0FBSztBQUN0QyxjQUFVLE1BQU0sVUFBVTtBQUMxQixjQUFVLFNBQVMsTUFBTSxFQUFFLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBT3ZDLFVBQU0sU0FBUyxLQUFLLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQztBQUNqRCxVQUFNLGFBQWEsTUFBTSxTQUFTLElBQUk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBQ3RDLGVBQVcsU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUN0QyxlQUFXLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBQ3RDLGVBQVcsU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUN0QyxlQUFXLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBR3RDLFVBQU0sUUFBUSxhQUFhLFVBQVUsRUFBRSxLQUFLLHNCQUFzQixDQUFDO0FBQ25FLFVBQU0sU0FBUyxNQUFNLEVBQUUsTUFBTSx3TEFBcUMsQ0FBQztBQUVuRSxVQUFNLFNBQVMsS0FBSyxFQUFFLE1BQU0sK1NBQTBELENBQUM7QUFFdkYsVUFBTSxTQUFTLE1BQU0sU0FBUyxJQUFJO0FBQ2xDLFdBQU8sU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUNsQyxXQUFPLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFFbEMsVUFBTSxTQUFTLEtBQUssRUFBRSxNQUFNLDBXQUF3RSxDQUFDO0FBRXJHLFVBQU0sWUFBWSxNQUFNLFNBQVMsS0FBSztBQUN0QyxjQUFVLE1BQU0sVUFBVTtBQUMxQixjQUFVLFNBQVMsTUFBTSxFQUFFLFlBQVk7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBT3ZDLFVBQU0sU0FBUyxLQUFLLEVBQUUsTUFBTSxpSEFBdUIsQ0FBQztBQUNwRCxVQUFNLGFBQWEsTUFBTSxTQUFTLElBQUk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBQ3RDLGVBQVcsU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUN0QyxlQUFXLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBQ3RDLGVBQVcsU0FBUyxJQUFJLEVBQUUsWUFBWTtBQUN0QyxlQUFXLFNBQVMsSUFBSSxFQUFFLFlBQVk7QUFDdEMsZUFBVyxTQUFTLElBQUksRUFBRSxZQUFZO0FBR3RDLFVBQU0sUUFBUSxTQUFTLGNBQWMsT0FBTztBQUM1QyxVQUFNLGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFxQ3BCLGdCQUFZLFlBQVksS0FBSztBQUFBLEVBQ2pDO0FBQ0o7IiwKICAibmFtZXMiOiBbXQp9Cg==
