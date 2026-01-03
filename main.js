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
    const keyHandler = (e) => {
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
    document.addEventListener("keydown", keyHandler);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibWFpbi50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgQXBwLCBQbHVnaW4sIFBsdWdpblNldHRpbmdUYWIsIFNldHRpbmcsIE1hcmtkb3duUG9zdFByb2Nlc3NvckNvbnRleHQgfSBmcm9tICdvYnNpZGlhbic7XHJcblxyXG5pbnRlcmZhY2UgR2FsbGVyeVNldHRpbmdzIHtcclxuICAgIG1heENvbHVtbnNEZXNrdG9wOiBudW1iZXI7XHJcbiAgICBtYXhDb2x1bW5zVGFibGV0OiBudW1iZXI7XHJcbiAgICBtYXhDb2x1bW5zTW9iaWxlOiBudW1iZXI7XHJcbiAgICBnYXBTaXplOiBzdHJpbmc7XHJcbiAgICBnYWxsZXJ5S2V5d29yZDogc3RyaW5nO1xyXG59XHJcblxyXG5jb25zdCBERUZBVUxUX1NFVFRJTkdTOiBHYWxsZXJ5U2V0dGluZ3MgPSB7XHJcbiAgICBtYXhDb2x1bW5zRGVza3RvcDogNCxcclxuICAgIG1heENvbHVtbnNUYWJsZXQ6IDMsXHJcbiAgICBtYXhDb2x1bW5zTW9iaWxlOiAyLFxyXG4gICAgZ2FwU2l6ZTogJzEycHgnLFxyXG4gICAgZ2FsbGVyeUtleXdvcmQ6ICdnYWxsZXJ5J1xyXG59O1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgSW1hZ2VHYWxsZXJ5UGx1Z2luIGV4dGVuZHMgUGx1Z2luIHtcclxuICAgIHNldHRpbmdzOiBHYWxsZXJ5U2V0dGluZ3M7XHJcbiAgICBwcml2YXRlIHpvb21MZXZlbDogbnVtYmVyID0gMTtcclxuICAgIHByaXZhdGUgaXNEcmFnZ2luZzogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgcHJpdmF0ZSBkcmFnU3RhcnRYOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBkcmFnU3RhcnRZOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBkcmFnT2Zmc2V0WDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgZHJhZ09mZnNldFk6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIHN0eWxlRWw6IEhUTUxTdHlsZUVsZW1lbnQ7XHJcbiAgICBwcml2YXRlIGFjdGl2ZUxpZ2h0Ym94OiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgXHJcbiAgICAvLyBcdTA0MTRcdTA0M0JcdTA0NEYgXHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDNBXHUwNDM4IFx1MDQ0MVx1MDQzMlx1MDQzMFx1MDQzOVx1MDQzRlx1MDQzRVx1MDQzMlxyXG4gICAgcHJpdmF0ZSB0b3VjaFN0YXJ0WDogbnVtYmVyID0gMDtcclxuICAgIHByaXZhdGUgdG91Y2hTdGFydFk6IG51bWJlciA9IDA7XHJcbiAgICBwcml2YXRlIHRvdWNoU3RhcnRUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgcHJpdmF0ZSBpc1N3aXBpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICBhc3luYyBvbmxvYWQoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ0xvYWRpbmcgSW1hZ2UgR2FsbGVyeSBwbHVnaW4nKTtcclxuICAgICAgICBcclxuICAgICAgICBhd2FpdCB0aGlzLmxvYWRTZXR0aW5ncygpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzM1x1MDQ0MFx1MDQ0M1x1MDQzNlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDFcdTA0NDJcdTA0MzBcdTA0NDJcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzUgXHUwNDQxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDM4XHJcbiAgICAgICAgdGhpcy5sb2FkU3R5bGVzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDE0XHUwNDNFXHUwNDMxXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzNFx1MDQzOFx1MDQzRFx1MDQzMFx1MDQzQ1x1MDQzOFx1MDQ0N1x1MDQzNVx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzNSBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzhcclxuICAgICAgICB0aGlzLmFkZER5bmFtaWNTdHlsZXMoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjBcdTA0MzVcdTA0MzNcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDBcdTA0MzhcdTA0NDBcdTA0NDNcdTA0MzVcdTA0M0MgXHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBIFx1MDQzMVx1MDQzQlx1MDQzRVx1MDQzQVx1MDQzRVx1MDQzMiBcdTA0M0FcdTA0M0VcdTA0MzRcdTA0MzAgXHUwNDQxIFx1MDQzRFx1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzMFx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQ1x1MDQ0Qlx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0MzJcdTA0NEJcdTA0M0MgXHUwNDQxXHUwNDNCXHUwNDNFXHUwNDMyXHUwNDNFXHUwNDNDXHJcbiAgICAgICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKHRoaXMuc2V0dGluZ3MuZ2FsbGVyeUtleXdvcmQsIGFzeW5jIChzb3VyY2UsIGVsLCBjdHgpID0+IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJHYWxsZXJ5KHNvdXJjZSwgZWwsIGN0eCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDE0XHUwNDNFXHUwNDMxXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQzQVx1MDQ0MyBcdTA0M0VcdTA0NDJcdTA0MzRcdTA0MzVcdTA0M0JcdTA0NENcdTA0M0RcdTA0NEJcdTA0NDUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5XHJcbiAgICAgICAgdGhpcy5zZXR1cEluZGl2aWR1YWxJbWFnZXMoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDMyXHUwNDNBXHUwNDNCXHUwNDMwXHUwNDM0XHUwNDNBXHUwNDQzIFx1MDQzRFx1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0MFx1MDQzRVx1MDQzNVx1MDQzQVxyXG4gICAgICAgIHRoaXMuYWRkU2V0dGluZ1RhYihuZXcgR2FsbGVyeVNldHRpbmdUYWIodGhpcy5hcHAsIHRoaXMpKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgbG9hZFN0eWxlcygpIHtcclxuICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDREXHUwNDNCXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0NDFcdTA0NDJcdTA0MzBcdTA0NDJcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0M0FcdTA0MzhcdTA0NDUgXHUwNDQxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDM1XHUwNDM5XHJcbiAgICAgICAgY29uc3Qgc3RhdGljU3R5bGVFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgc3RhdGljU3R5bGVFbC5pZCA9ICdvYnNpZGlhbi1nYWxsZXJ5LXN0YXRpYy1zdHlsZXMnO1xyXG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoc3RhdGljU3R5bGVFbCk7XHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDM4IFx1MDQzMVx1MDQ0M1x1MDQzNFx1MDQ0M1x1MDQ0MiBcdTA0MzdcdTA0MzBcdTA0MzNcdTA0NDBcdTA0NDNcdTA0MzZcdTA0MzVcdTA0M0RcdTA0NEIgXHUwNDM4XHUwNDM3IHN0eWxlcy5jc3MgXHUwNDMwXHUwNDMyXHUwNDQyXHUwNDNFXHUwNDNDXHUwNDMwXHUwNDQyXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDQxXHUwNDNBXHUwNDM4XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGFkZER5bmFtaWNTdHlsZXMoKSB7XHJcbiAgICAgICAgLy8gXHUwNDIzXHUwNDM0XHUwNDMwXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQ0Mlx1MDQzMFx1MDQ0MFx1MDQ0Qlx1MDQzOSBcdTA0MzRcdTA0MzhcdTA0M0RcdTA0MzBcdTA0M0NcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzkgXHUwNDQxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDRDLCBcdTA0MzVcdTA0NDFcdTA0M0JcdTA0MzggXHUwNDM1XHUwNDQxXHUwNDQyXHUwNDRDXHJcbiAgICAgICAgaWYgKHRoaXMuc3R5bGVFbCkge1xyXG4gICAgICAgICAgICB0aGlzLnN0eWxlRWwucmVtb3ZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuc3R5bGVFbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3N0eWxlJyk7XHJcbiAgICAgICAgdGhpcy5zdHlsZUVsLmlkID0gJ29ic2lkaWFuLWdhbGxlcnktZHluYW1pYy1zdHlsZXMnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxRVx1MDQzMVx1MDQzRFx1MDQzRVx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0MzRcdTA0MzhcdTA0M0RcdTA0MzBcdTA0M0NcdTA0MzhcdTA0NDdcdTA0MzVcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzUgXHUwNDQxXHUwNDQyXHUwNDM4XHUwNDNCXHUwNDM4IFx1MDQ0MSBcdTA0NDJcdTA0MzVcdTA0M0FcdTA0NDNcdTA0NDlcdTA0MzhcdTA0M0NcdTA0MzggXHUwNDNEXHUwNDMwXHUwNDQxXHUwNDQyXHUwNDQwXHUwNDNFXHUwNDM5XHUwNDNBXHUwNDMwXHUwNDNDXHUwNDM4XHJcbiAgICAgICAgdGhpcy51cGRhdGVEeW5hbWljU3R5bGVzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCh0aGlzLnN0eWxlRWwpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB1cGRhdGVEeW5hbWljU3R5bGVzKCkge1xyXG4gICAgICAgIGNvbnN0IGR5bmFtaWNDc3MgPSBgXHJcbiAgICAgICAgICAgIC5nYWxsZXJ5LWdyaWQge1xyXG4gICAgICAgICAgICAgICAgZ2FwOiAke3RoaXMuc2V0dGluZ3MuZ2FwU2l6ZX07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8qIFx1MDQxMFx1MDQzNFx1MDQzMFx1MDQzRlx1MDQ0Mlx1MDQzOFx1MDQzMlx1MDQzRFx1MDQzMFx1MDQ0RiBcdTA0NDFcdTA0MzVcdTA0NDJcdTA0M0FcdTA0MzAgXHUwNDQxIFx1MDQzRVx1MDQzM1x1MDQ0MFx1MDQzMFx1MDQzRFx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNVx1MDQzQyBcdTA0M0NcdTA0MzBcdTA0M0FcdTA0NDFcdTA0MzhcdTA0M0NcdTA0MzBcdTA0M0JcdTA0NENcdTA0M0RcdTA0M0VcdTA0MzNcdTA0M0UgXHUwNDNBXHUwNDNFXHUwNDNCXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDQxXHUwNDQyXHUwNDMyXHUwNDMwIFx1MDQzQVx1MDQzRVx1MDQzQlx1MDQzRVx1MDQzRFx1MDQzRVx1MDQzQSAqL1xyXG4gICAgICAgICAgICAvKiBcdTA0MTRcdTA0MzVcdTA0NDFcdTA0M0FcdTA0NDJcdTA0M0VcdTA0M0YgKi9cclxuICAgICAgICAgICAgQG1lZGlhIChtaW4td2lkdGg6IDEwMjRweCkge1xyXG4gICAgICAgICAgICAgICAgLmdhbGxlcnktZ3JpZCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maWxsLCBtaW5tYXgoY2FsYygxMDAlIC8gbWluKCR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zRGVza3RvcH0sIHZhcigtLWltYWdlLWNvdW50LCAke3RoaXMuc2V0dGluZ3MubWF4Q29sdW1uc0Rlc2t0b3B9KSkgLSAyMHB4KSwgMWZyKSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8qIFx1MDQxRlx1MDQzQlx1MDQzMFx1MDQzRFx1MDQ0OFx1MDQzNVx1MDQ0MiAqL1xyXG4gICAgICAgICAgICBAbWVkaWEgKG1pbi13aWR0aDogNzY4cHgpIGFuZCAobWF4LXdpZHRoOiAxMDIzcHgpIHtcclxuICAgICAgICAgICAgICAgIC5nYWxsZXJ5LWdyaWQge1xyXG4gICAgICAgICAgICAgICAgICAgIGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZmlsbCwgbWlubWF4KGNhbGMoMTAwJSAvIG1pbigke3RoaXMuc2V0dGluZ3MubWF4Q29sdW1uc1RhYmxldH0sIHZhcigtLWltYWdlLWNvdW50LCAke3RoaXMuc2V0dGluZ3MubWF4Q29sdW1uc1RhYmxldH0pKSAtIDIwcHgpLCAxZnIpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLyogXHUwNDFDXHUwNDNFXHUwNDMxXHUwNDM4XHUwNDNCXHUwNDRDXHUwNDNEXHUwNDRCXHUwNDM5ICovXHJcbiAgICAgICAgICAgIEBtZWRpYSAobWF4LXdpZHRoOiA3NjdweCkge1xyXG4gICAgICAgICAgICAgICAgLmdhbGxlcnktZ3JpZCB7XHJcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maWxsLCBtaW5tYXgoY2FsYygxMDAlIC8gbWluKCR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zTW9iaWxlfSwgdmFyKC0taW1hZ2UtY291bnQsICR7dGhpcy5zZXR0aW5ncy5tYXhDb2x1bW5zTW9iaWxlfSkpIC0gMjBweCksIDFmcikpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvKiBcdTA0MjFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0NEMgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzRVx1MDQ0Mlx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0Qlx1MDQ0NSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzkgKi9cclxuICAgICAgICAgICAgLm1hcmtkb3duLXNvdXJjZS12aWV3IGltZzpub3QoLmdhbGxlcnktaXRlbSBpbWcpLFxyXG4gICAgICAgICAgICAubWFya2Rvd24tcHJldmlldy12aWV3IGltZzpub3QoLmdhbGxlcnktaXRlbSBpbWcpIHtcclxuICAgICAgICAgICAgICAgIGN1cnNvcjogem9vbS1pbjtcclxuICAgICAgICAgICAgICAgIHRyYW5zaXRpb246IG9wYWNpdHkgMC4ycyBlYXNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAubWFya2Rvd24tc291cmNlLXZpZXcgaW1nOm5vdCguZ2FsbGVyeS1pdGVtIGltZyk6aG92ZXIsXHJcbiAgICAgICAgICAgIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcgaW1nOm5vdCguZ2FsbGVyeS1pdGVtIGltZyk6aG92ZXIge1xyXG4gICAgICAgICAgICAgICAgb3BhY2l0eTogMC45O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgYDtcclxuICAgICAgICBcclxuICAgICAgICB0aGlzLnN0eWxlRWwudGV4dENvbnRlbnQgPSBkeW5hbWljQ3NzO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBhc3luYyByZW5kZXJHYWxsZXJ5KHNvdXJjZTogc3RyaW5nLCBlbDogSFRNTEVsZW1lbnQsIGN0eDogTWFya2Rvd25Qb3N0UHJvY2Vzc29yQ29udGV4dCkge1xyXG4gICAgICAgIC8vIFx1MDQxRVx1MDQ0N1x1MDQzOFx1MDQ0OVx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0VcdTA0M0RcdTA0NDJcdTA0MzVcdTA0MzlcdTA0M0RcdTA0MzVcdTA0NDBcclxuICAgICAgICBlbC5lbXB0eSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0VcdTA0M0RcdTA0NDJcdTA0MzVcdTA0MzlcdTA0M0RcdTA0MzVcdTA0NDAgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzOFxyXG4gICAgICAgIGNvbnN0IGdhbGxlcnlDb250YWluZXIgPSBlbC5jcmVhdGVEaXYoeyBjbHM6ICdnYWxsZXJ5LWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFGXHUwNDMwXHUwNDQwXHUwNDQxXHUwNDM4XHUwNDNDIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RiBcdTA0MzhcdTA0MzcgXHUwNDMxXHUwNDNCXHUwNDNFXHUwNDNBXHUwNDMwIFx1MDQzQVx1MDQzRVx1MDQzNFx1MDQzMFxyXG4gICAgICAgIGNvbnN0IGltYWdlUmVnZXggPSAvIVxcW1xcWyguKj9cXC4oPzpqcGd8anBlZ3xwbmd8Z2lmfGJtcHxzdmd8d2VicHx0aWZmfGF2aWYpKSg/OlxcfC4qPyk/XFxdXFxdL2dpO1xyXG4gICAgICAgIGNvbnN0IGltYWdlTWF0Y2hlcyA9IHNvdXJjZS5tYXRjaChpbWFnZVJlZ2V4KSB8fCBbXTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoaW1hZ2VNYXRjaGVzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICBnYWxsZXJ5Q29udGFpbmVyLnNldFRleHQoJ05vIGltYWdlcyBmb3VuZCBpbiBnYWxsZXJ5IGJsb2NrLicpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDFcdTA0MzVcdTA0NDJcdTA0M0FcdTA0NDMgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5XHJcbiAgICAgICAgY29uc3QgZ3JpZCA9IGdhbGxlcnlDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZ2FsbGVyeS1ncmlkJyB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjNcdTA0NDFcdTA0NDJcdTA0MzBcdTA0M0RcdTA0MzBcdTA0MzJcdTA0M0JcdTA0MzhcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgQ1NTIFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQzRFx1MDQzRFx1MDQ0M1x1MDQ0RSBcdTA0NDEgXHUwNDNBXHUwNDNFXHUwNDNCXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDQxXHUwNDQyXHUwNDMyXHUwNDNFXHUwNDNDIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOVxyXG4gICAgICAgIGdyaWQuc3R5bGUuc2V0UHJvcGVydHkoJy0taW1hZ2UtY291bnQnLCBpbWFnZU1hdGNoZXMubGVuZ3RoLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzMVx1MDQzOFx1MDQ0MFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0MzRcdTA0MzBcdTA0M0RcdTA0M0RcdTA0NEJcdTA0MzUgXHUwNDNFXHUwNDMxIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0Rlx1MDQ0NVxyXG4gICAgICAgIGNvbnN0IGltYWdlczogQXJyYXk8e3NyYzogc3RyaW5nLCBhbHQ6IHN0cmluZ30+ID0gW107XHJcbiAgICAgICAgXHJcbiAgICAgICAgZm9yIChjb25zdCBtYXRjaCBvZiBpbWFnZU1hdGNoZXMpIHtcclxuICAgICAgICAgICAgY29uc3QgZnVsbE1hdGNoID0gbWF0Y2gubWF0Y2goLyFcXFtcXFsoLio/KSg/OlxcfCguKj8pKT9cXF1cXF0vKTtcclxuICAgICAgICAgICAgaWYgKCFmdWxsTWF0Y2gpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgZmlsZW5hbWUgPSBmdWxsTWF0Y2hbMV07XHJcbiAgICAgICAgICAgIGNvbnN0IGFsdFRleHQgPSBmdWxsTWF0Y2hbMl0gfHwgZmlsZW5hbWUuc3BsaXQoJy8nKS5wb3AoKSB8fCBmaWxlbmFtZTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUZcdTA0M0VcdTA0M0JcdTA0NDNcdTA0NDdcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNGXHUwNDQzXHUwNDQyXHUwNDRDIFx1MDQzQSBcdTA0NDRcdTA0MzBcdTA0MzlcdTA0M0JcdTA0NDNcclxuICAgICAgICAgICAgICAgIGNvbnN0IGZpbGUgPSB0aGlzLmFwcC5tZXRhZGF0YUNhY2hlLmdldEZpcnN0TGlua3BhdGhEZXN0KGZpbGVuYW1lLCBjdHguc291cmNlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWZpbGUpIGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUZcdTA0M0VcdTA0M0JcdTA0NDNcdTA0NDdcdTA0MzBcdTA0MzVcdTA0M0MgVVJMIFx1MDQ0MFx1MDQzNVx1MDQ0MVx1MDQ0M1x1MDQ0MFx1MDQ0MVx1MDQzMFxyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVzb3VyY2VQYXRoID0gdGhpcy5hcHAudmF1bHQuZ2V0UmVzb3VyY2VQYXRoKGZpbGUpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDREXHUwNDNCXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgICAgICAgICAgY29uc3QgaW1nQ29udGFpbmVyID0gZ3JpZC5jcmVhdGVEaXYoeyBjbHM6ICdnYWxsZXJ5LWl0ZW0nIH0pO1xyXG4gICAgICAgICAgICAgICAgaW1nQ29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZGF0YS1zcmMnLCByZXNvdXJjZVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaW1nQ29udGFpbmVyLnNldEF0dHJpYnV0ZSgnZGF0YS1hbHQnLCBhbHRUZXh0KTtcclxuICAgICAgICAgICAgICAgIGltZ0NvbnRhaW5lci5zZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgnLCBpbWFnZXMubGVuZ3RoLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zdCBpbWcgPSBpbWdDb250YWluZXIuY3JlYXRlRWwoJ2ltZycsIHtcclxuICAgICAgICAgICAgICAgICAgICBhdHRyOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNyYzogcmVzb3VyY2VQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBhbHQ6IGFsdFRleHQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvYWRpbmc6ICdsYXp5J1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0FcdTA0MzggXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzM1x1MDQzMFx1MDQzQlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzOFxyXG4gICAgICAgICAgICAgICAgaW1nQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZS5idXR0b24gPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDMxXHUwNDM4XHUwNDQwXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzMlx1MDQ0MVx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDM4XHUwNDM3IFx1MDQ0RFx1MDQ0Mlx1MDQzRVx1MDQzOSBcdTA0MzNcdTA0MzBcdTA0M0JcdTA0MzVcdTA0NDBcdTA0MzVcdTA0MzhcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2FsbGVyeUltYWdlcyA9IEFycmF5LmZyb20oZ3JpZC5xdWVyeVNlbGVjdG9yQWxsKCcuZ2FsbGVyeS1pdGVtJykpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAubWFwKGl0ZW0gPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzcmM6IGl0ZW0uZ2V0QXR0cmlidXRlKCdkYXRhLXNyYycpIHx8ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsdDogaXRlbS5nZXRBdHRyaWJ1dGUoJ2RhdGEtYWx0JykgfHwgJydcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGluZGV4ID0gcGFyc2VJbnQoaW1nQ29udGFpbmVyLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcpIHx8ICcwJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3BlbkxpZ2h0Ym94KGdhbGxlcnlJbWFnZXMsIGluZGV4KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaW1hZ2VzLnB1c2goe1xyXG4gICAgICAgICAgICAgICAgICAgIHNyYzogcmVzb3VyY2VQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgIGFsdDogYWx0VGV4dFxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgaW1hZ2U6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBvcGVuTGlnaHRib3goaW1hZ2VzOiBBcnJheTx7c3JjOiBzdHJpbmcsIGFsdDogc3RyaW5nfT4sIHN0YXJ0SW5kZXg6IG51bWJlcikge1xyXG4gICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0ZcdTA0NDBcdTA0MzVcdTA0MzRcdTA0NEJcdTA0MzRcdTA0NDNcdTA0NDlcdTA0MzhcdTA0MzkgbGlnaHRib3gsIFx1MDQzNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0MzVcdTA0NDFcdTA0NDJcdTA0NENcclxuICAgICAgICBpZiAodGhpcy5hY3RpdmVMaWdodGJveCkge1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlTGlnaHRib3goKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIGJhY2tkcm9wXHJcbiAgICAgICAgY29uc3QgYmFja2Ryb3AgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICBiYWNrZHJvcC5jbGFzc05hbWUgPSAnbGctYmFja2Ryb3AnO1xyXG4gICAgICAgIHRoaXMuYWN0aXZlTGlnaHRib3ggPSBiYWNrZHJvcDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNBXHUwNDNFXHUwNDNEXHUwNDQyXHUwNDM1XHUwNDM5XHUwNDNEXHUwNDM1XHUwNDQwIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBjb25zdCBpbWFnZUNvbnRhaW5lciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmNsYXNzTmFtZSA9ICdsZy1pbWFnZS1jb250YWluZXInO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzRVx1MDQzN1x1MDQzNFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDIgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgY29uc3QgaW1nID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnaW1nJyk7XHJcbiAgICAgICAgaW1nLmNsYXNzTmFtZSA9ICdsZy1pbWFnZSc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQ0RFx1MDQzQlx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQzRFx1MDQ0Mlx1MDQ0QiBcdTA0NDNcdTA0M0ZcdTA0NDBcdTA0MzBcdTA0MzJcdTA0M0JcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBjb25zdCBwcmV2QnRuID0gdGhpcy5jcmVhdGVCdXR0b24oJ1x1MjE5MCcsICdsZy1idG4gbGctcHJldicpO1xyXG4gICAgICAgIGNvbnN0IG5leHRCdG4gPSB0aGlzLmNyZWF0ZUJ1dHRvbignXHUyMTkyJywgJ2xnLWJ0biBsZy1uZXh0Jyk7XHJcbiAgICAgICAgY29uc3QgY291bnRlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIGNvdW50ZXIuY2xhc3NOYW1lID0gJ2xnLWNvdW50ZXInO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxQVx1MDQzRFx1MDQzRVx1MDQzRlx1MDQzQVx1MDQzOCBcdTA0M0NcdTA0MzBcdTA0NDFcdTA0NDhcdTA0NDJcdTA0MzBcdTA0MzFcdTA0MzhcdTA0NDBcdTA0M0VcdTA0MzJcdTA0MzBcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICAvL2NvbnN0IHpvb21JbkJ0biA9IHRoaXMuY3JlYXRlQnV0dG9uKCcrJywgJ2xnLWJ0bicpO1xyXG4gICAgICAgIC8vY29uc3Qgem9vbU91dEJ0biA9IHRoaXMuY3JlYXRlQnV0dG9uKCctJywgJ2xnLWJ0bicpO1xyXG4gICAgICAgIC8vY29uc3QgcmVzZXRab29tQnRuID0gdGhpcy5jcmVhdGVCdXR0b24oJ1x1MjFCQicsICdsZy1idG4nKTtcclxuICAgICAgICBcclxuICAgICAgICAvKmNvbnN0IHpvb21Db250cm9scyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xyXG4gICAgICAgIHpvb21Db250cm9scy5jbGFzc05hbWUgPSAnbGctem9vbS1jb250cm9scyc7XHJcbiAgICAgICAgem9vbUNvbnRyb2xzLmFwcGVuZENoaWxkKHpvb21JbkJ0bik7XHJcbiAgICAgICAgem9vbUNvbnRyb2xzLmFwcGVuZENoaWxkKHpvb21PdXRCdG4pO1xyXG4gICAgICAgIHpvb21Db250cm9scy5hcHBlbmRDaGlsZChyZXNldFpvb21CdG4pO1xyXG4gICAgICAgICovXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIxXHUwNDNFXHUwNDM3XHUwNDM0XHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQ1x1MDQzOFx1MDQzRFx1MDQzOFx1MDQzMFx1MDQ0Mlx1MDQ0RVx1MDQ0MFx1MDQ0QiwgXHUwNDM1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOSBcdTA0MzFcdTA0M0VcdTA0M0JcdTA0NENcdTA0NDhcdTA0MzUgMVxyXG4gICAgICAgIGxldCB0aHVtYm5haWxzQ29udGFpbmVyOiBIVE1MRWxlbWVudCB8IG51bGwgPSBudWxsO1xyXG4gICAgICAgIGNvbnN0IHRodW1iczogSFRNTEltYWdlRWxlbWVudFtdID0gW107XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKGltYWdlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHRodW1ibmFpbHNDb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcclxuICAgICAgICAgICAgdGh1bWJuYWlsc0NvbnRhaW5lci5jbGFzc05hbWUgPSAnbGctdGh1bWJuYWlscyc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpbWFnZXMuZm9yRWFjaCgoaW1hZ2UsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0aHVtYiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2ltZycpO1xyXG4gICAgICAgICAgICAgICAgdGh1bWIuY2xhc3NOYW1lID0gJ2xnLXRodW1ibmFpbCc7XHJcbiAgICAgICAgICAgICAgICB0aHVtYi5zcmMgPSBpbWFnZS5zcmM7XHJcbiAgICAgICAgICAgICAgICB0aHVtYi5zZXRBdHRyaWJ1dGUoJ2RhdGEtaW5kZXgnLCBpbmRleC50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgIHRodW1iLmFsdCA9IGltYWdlLmFsdDtcclxuICAgICAgICAgICAgICAgIHRodW1iLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlTGlnaHRib3hJbWFnZShpbWFnZXMsIGluZGV4LCBpbWcsIGNvdW50ZXIsIHRodW1icyk7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudEluZGV4ID0gaW5kZXg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB0aHVtYm5haWxzQ29udGFpbmVyIS5hcHBlbmRDaGlsZCh0aHVtYik7XHJcbiAgICAgICAgICAgICAgICB0aHVtYnMucHVzaCh0aHVtYik7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDREXHUwNDNCXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDNEXHUwNDQyXHUwNDRCIFx1MDQzMiBiYWNrZHJvcFxyXG4gICAgICAgIGJhY2tkcm9wLmFwcGVuZENoaWxkKGltYWdlQ29udGFpbmVyKTtcclxuICAgICAgICBpbWFnZUNvbnRhaW5lci5hcHBlbmRDaGlsZChpbWcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0RcdTA0M0VcdTA0M0ZcdTA0M0FcdTA0MzggXHUwNDNEXHUwNDMwXHUwNDMyXHUwNDM4XHUwNDMzXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4IFx1MDQ0Mlx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzQVx1MDQzRSBcdTA0MzVcdTA0NDFcdTA0M0JcdTA0MzggXHUwNDMxXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDQ4XHUwNDM1IFx1MDQzRVx1MDQzNFx1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBpZiAoaW1hZ2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgYmFja2Ryb3AuYXBwZW5kQ2hpbGQocHJldkJ0bik7XHJcbiAgICAgICAgICAgIGJhY2tkcm9wLmFwcGVuZENoaWxkKG5leHRCdG4pO1xyXG4gICAgICAgICAgICBiYWNrZHJvcC5hcHBlbmRDaGlsZCh0aHVtYm5haWxzQ29udGFpbmVyISk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gXHUwNDE0XHUwNDNCXHUwNDRGIFx1MDQzRVx1MDQzNFx1MDQzOFx1MDQzRFx1MDQzRVx1MDQ0N1x1MDQzRFx1MDQ0Qlx1MDQ0NSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzkgXHUwNDQxXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzRFx1MDQzMFx1MDQzMlx1MDQzOFx1MDQzM1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQ0RSBcdTA0MzggXHUwNDQxXHUwNDQ3XHUwNDM1XHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHJcbiAgICAgICAgICAgIGNvdW50ZXIuc3R5bGUuZGlzcGxheSA9ICdub25lJztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgYmFja2Ryb3AuYXBwZW5kQ2hpbGQoY291bnRlcik7XHJcbiAgICAgICAgLy9iYWNrZHJvcC5hcHBlbmRDaGlsZCh6b29tQ29udHJvbHMpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBiYWNrZHJvcCBcdTA0MzIgRE9NXHJcbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChiYWNrZHJvcCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDExXHUwNDNCXHUwNDNFXHUwNDNBXHUwNDM4XHUwNDQwXHUwNDQzXHUwNDM1XHUwNDNDIFx1MDQzRlx1MDQ0MFx1MDQzRVx1MDQzQVx1MDQ0MFx1MDQ0M1x1MDQ0Mlx1MDQzQVx1MDQ0MyBcdTA0NDFcdTA0NDJcdTA0NDBcdTA0MzBcdTA0M0RcdTA0MzhcdTA0NDZcdTA0NEJcclxuICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJ2hpZGRlbic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIyXHUwNDM1XHUwNDNBXHUwNDQzXHUwNDQ5XHUwNDM4XHUwNDM5IFx1MDQzOFx1MDQzRFx1MDQzNFx1MDQzNVx1MDQzQVx1MDQ0MSBcdTA0MzggXHUwNDQxXHUwNDNFXHUwNDQxXHUwNDQyXHUwNDNFXHUwNDRGXHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMVx1MDQzMFxyXG4gICAgICAgIGxldCBjdXJyZW50SW5kZXggPSBzdGFydEluZGV4O1xyXG4gICAgICAgIHRoaXMuem9vbUxldmVsID0gMTtcclxuICAgICAgICB0aGlzLmlzRHJhZ2dpbmcgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmRyYWdPZmZzZXRYID0gMDtcclxuICAgICAgICB0aGlzLmRyYWdPZmZzZXRZID0gMDtcclxuICAgICAgICB0aGlzLmlzU3dpcGluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyNFx1MDQ0M1x1MDQzRFx1MDQzQVx1MDQ0Nlx1MDQzOFx1MDQ0RiBcdTA0M0VcdTA0MzFcdTA0M0RcdTA0M0VcdTA0MzJcdTA0M0JcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgY29uc3QgdXBkYXRlSW1hZ2UgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGltZy5zcmMgPSBpbWFnZXNbY3VycmVudEluZGV4XS5zcmM7XHJcbiAgICAgICAgICAgIGltZy5hbHQgPSBpbWFnZXNbY3VycmVudEluZGV4XS5hbHQ7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MjFcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDFcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDQyXHUwNDQwXHUwNDMwXHUwNDNEXHUwNDQxXHUwNDQ0XHUwNDNFXHUwNDQwXHUwNDNDXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4XHJcbiAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7dGhpcy5kcmFnT2Zmc2V0WH1weCwgJHt0aGlzLmRyYWdPZmZzZXRZfXB4KSBzY2FsZSgke3RoaXMuem9vbUxldmVsfSlgO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQ0N1x1MDQzNVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQVxyXG4gICAgICAgICAgICBjb3VudGVyLnRleHRDb250ZW50ID0gYCR7Y3VycmVudEluZGV4ICsgMX0gLyAke2ltYWdlcy5sZW5ndGh9YDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxRVx1MDQzMVx1MDQzRFx1MDQzRVx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0MzBcdTA0M0FcdTA0NDJcdTA0MzhcdTA0MzJcdTA0M0RcdTA0NDNcdTA0NEUgXHUwNDNDXHUwNDM4XHUwNDNEXHUwNDM4XHUwNDMwXHUwNDQyXHUwNDRFXHUwNDQwXHUwNDQzXHJcbiAgICAgICAgICAgIHRodW1icy5mb3JFYWNoKCh0aHVtYiwgaW5kZXgpID0+IHtcclxuICAgICAgICAgICAgICAgIHRodW1iLmNsYXNzTGlzdC50b2dnbGUoJ2FjdGl2ZScsIGluZGV4ID09PSBjdXJyZW50SW5kZXgpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQ0MFx1MDQzRVx1MDQzQVx1MDQ0MFx1MDQ0M1x1MDQ0N1x1MDQzOFx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0NcdTA0MzhcdTA0M0RcdTA0MzhcdTA0MzBcdTA0NDJcdTA0NEVcdTA0NDBcdTA0NDMgXHUwNDMyIFx1MDQzMlx1MDQzOFx1MDQzNFx1MDQzOFx1MDQzQ1x1MDQ0M1x1MDQ0RSBcdTA0M0VcdTA0MzFcdTA0M0JcdTA0MzBcdTA0NDFcdTA0NDJcdTA0NENcclxuICAgICAgICAgICAgaWYgKHRodW1ic1tjdXJyZW50SW5kZXhdKSB7XHJcbiAgICAgICAgICAgICAgICB0aHVtYnNbY3VycmVudEluZGV4XS5zY3JvbGxJbnRvVmlldyh7XHJcbiAgICAgICAgICAgICAgICAgICAgYmVoYXZpb3I6ICdzbW9vdGgnLFxyXG4gICAgICAgICAgICAgICAgICAgIGJsb2NrOiAnbmVhcmVzdCcsXHJcbiAgICAgICAgICAgICAgICAgICAgaW5saW5lOiAnY2VudGVyJ1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyNFx1MDQ0M1x1MDQzRFx1MDQzQVx1MDQ0Nlx1MDQzOFx1MDQ0RiBcdTA0M0ZcdTA0MzVcdTA0NDBcdTA0MzVcdTA0M0FcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgY29uc3Qgc3dpdGNoSW1hZ2UgPSAoZGlyZWN0aW9uOiAnbmV4dCcgfCAncHJldicpID0+IHtcclxuICAgICAgICAgICAgaWYgKGltYWdlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZGlyZWN0aW9uID09PSAnbmV4dCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW5kZXggPSAoY3VycmVudEluZGV4ICsgMSkgJSBpbWFnZXMubGVuZ3RoO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50SW5kZXggPSAoY3VycmVudEluZGV4IC0gMSArIGltYWdlcy5sZW5ndGgpICUgaW1hZ2VzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMucmVzZXRab29tQW5kUG9zaXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHVwZGF0ZUltYWdlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyNFx1MDQ0M1x1MDQzRFx1MDQzQVx1MDQ0Nlx1MDQzOFx1MDQ0RiBcdTA0MzdcdTA0MzBcdTA0M0FcdTA0NDBcdTA0NEJcdTA0NDJcdTA0MzhcdTA0NEYgbGlnaHRib3hcclxuICAgICAgICBjb25zdCBjbG9zZUxpZ2h0Ym94ID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmNsb3NlTGlnaHRib3goKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQVx1MDQzOCBcdTA0M0RcdTA0MzBcdTA0MzJcdTA0MzhcdTA0MzNcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzggKFx1MDQ0Mlx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzQVx1MDQzRSBcdTA0MzVcdTA0NDFcdTA0M0JcdTA0MzggXHUwNDMxXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDQ4XHUwNDM1IFx1MDQzRVx1MDQzNFx1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYpXHJcbiAgICAgICAgaWYgKGltYWdlcy5sZW5ndGggPiAxKSB7XHJcbiAgICAgICAgICAgIHByZXZCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaEltYWdlKCdwcmV2Jyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgbmV4dEJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoSW1hZ2UoJ25leHQnKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQVx1MDQzOCBcdTA0M0NcdTA0MzBcdTA0NDFcdTA0NDhcdTA0NDJcdTA0MzBcdTA0MzFcdTA0MzhcdTA0NDBcdTA0M0VcdTA0MzJcdTA0MzBcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICAvKnpvb21JbkJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy56b29tTGV2ZWwgPSBNYXRoLm1pbih0aGlzLnpvb21MZXZlbCAqIDEuMiwgNSk7XHJcbiAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7dGhpcy5kcmFnT2Zmc2V0WH1weCwgJHt0aGlzLmRyYWdPZmZzZXRZfXB4KSBzY2FsZSgke3RoaXMuem9vbUxldmVsfSlgO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHpvb21PdXRCdG4uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuem9vbUxldmVsID0gTWF0aC5tYXgodGhpcy56b29tTGV2ZWwgLyAxLjIsIDAuNSk7XHJcbiAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7dGhpcy5kcmFnT2Zmc2V0WH1weCwgJHt0aGlzLmRyYWdPZmZzZXRZfXB4KSBzY2FsZSgke3RoaXMuem9vbUxldmVsfSlgO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJlc2V0Wm9vbUJ0bi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICBpbWcuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgwcHgsIDBweCkgc2NhbGUoMSlgO1xyXG4gICAgICAgIH0pOyovXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDMxXHUwNDNFXHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHUwNDM4IFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0MzRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0M0VcdTA0MzNcdTA0M0UgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDMwL1x1MDQ0Mlx1MDQzMFx1MDQzRlx1MDQzMCAoXHUwNDQxXHUwNDMxXHUwNDQwXHUwNDNFXHUwNDQxIFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMVx1MDQzMClcclxuICAgICAgICBsZXQgbGFzdFRhcFRpbWUgPSAwO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGhhbmRsZURvdWJsZVRhcCA9IChlOiBNb3VzZUV2ZW50IHwgVG91Y2hFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIGUuc3RvcFByb3BhZ2F0aW9uKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MTRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDNBXHUwNDNCXHUwNDMwXHUwNDQxXHUwNDQxIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0NDFcdTA0M0ZcdTA0MzVcdTA0NDZcdTA0MzhcdTA0MzBcdTA0M0JcdTA0NENcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDNDXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDM4IFx1MDQzN1x1MDQ0M1x1MDQzQ1x1MDQzMFxyXG4gICAgICAgICAgICBpbWcuY2xhc3NMaXN0LmFkZCgnem9vbWluZycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDQxXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzN1x1MDQ0M1x1MDQzQyBcdTA0MzggXHUwNDNGXHUwNDNFXHUwNDM3XHUwNDM4XHUwNDQ2XHUwNDM4XHUwNDRFXHJcbiAgICAgICAgICAgIHRoaXMucmVzZXRab29tQW5kUG9zaXRpb24oKTtcclxuICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMHB4LCAwcHgpIHNjYWxlKDEpJztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQyM1x1MDQzMVx1MDQzOFx1MDQ0MFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0M0JcdTA0MzBcdTA0NDFcdTA0NDEgXHUwNDNGXHUwNDNFXHUwNDQxXHUwNDNCXHUwNDM1IFx1MDQzMFx1MDQzRFx1MDQzOFx1MDQzQ1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQzOFxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIGltZy5jbGFzc0xpc3QucmVtb3ZlKCd6b29taW5nJyk7XHJcbiAgICAgICAgICAgIH0sIDMwMCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBIFx1MDQzQ1x1MDQ0Qlx1MDQ0OFx1MDQ0Q1x1MDQ0RVxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ2RibGNsaWNrJywgaGFuZGxlRG91YmxlVGFwKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MTRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDQyXHUwNDMwXHUwNDNGIFx1MDQzRFx1MDQzMCBcdTA0M0NcdTA0M0VcdTA0MzFcdTA0MzhcdTA0M0JcdTA0NENcdTA0M0RcdTA0NEJcdTA0NDVcclxuICAgICAgICBpbWFnZUNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHN0YXJ0JywgKGUpID0+IHtcclxuICAgICAgICAgICAgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB0YXBMZW5ndGggPSBjdXJyZW50VGltZSAtIGxhc3RUYXBUaW1lO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAodGFwTGVuZ3RoIDwgMzAwICYmIHRhcExlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBcdTA0MTRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDQyXHUwNDMwXHUwNDNGXHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlRG91YmxlVGFwKGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBsYXN0VGFwVGltZSA9IGN1cnJlbnRUaW1lO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFDXHUwNDMwXHUwNDQxXHUwNDQ4XHUwNDQyXHUwNDMwXHUwNDMxXHUwNDM4XHUwNDQwXHUwNDNFXHUwNDMyXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzQVx1MDQzRVx1MDQzQlx1MDQzNVx1MDQ0MVx1MDQzOFx1MDQzQVx1MDQzRVx1MDQzQyBcdTA0M0NcdTA0NEJcdTA0NDhcdTA0MzhcclxuICAgICAgICBpbWFnZUNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCd3aGVlbCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IGRlbHRhID0gZS5kZWx0YVkgPiAwID8gMC45IDogMS4xO1xyXG4gICAgICAgICAgICB0aGlzLnpvb21MZXZlbCA9IE1hdGgubWF4KDAuNSwgTWF0aC5taW4odGhpcy56b29tTGV2ZWwgKiBkZWx0YSwgNSkpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgfSwgeyBwYXNzaXZlOiBmYWxzZSB9KTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUZcdTA0MzVcdTA0NDBcdTA0MzVcdTA0NDJcdTA0MzBcdTA0NDFcdTA0M0FcdTA0MzhcdTA0MzJcdTA0MzBcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIChcdTA0NDJcdTA0M0VcdTA0M0JcdTA0NENcdTA0M0FcdTA0M0UgXHUwNDNGXHUwNDQwXHUwNDM4IFx1MDQzN1x1MDQ0M1x1MDQzQ1x1MDQzNSA+IDEpXHJcbiAgICAgICAgY29uc3Qgc3RhcnREcmFnID0gKGNsaWVudFg6IG51bWJlciwgY2xpZW50WTogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnpvb21MZXZlbCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNEcmFnZ2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpbWFnZUNvbnRhaW5lci5jbGFzc0xpc3QuYWRkKCdkcmFnZ2luZycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnU3RhcnRYID0gY2xpZW50WCAtIHRoaXMuZHJhZ09mZnNldFg7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRyYWdTdGFydFkgPSBjbGllbnRZIC0gdGhpcy5kcmFnT2Zmc2V0WTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZG9EcmFnID0gKGNsaWVudFg6IG51bWJlciwgY2xpZW50WTogbnVtYmVyKSA9PiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzRHJhZ2dpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZHJhZ09mZnNldFggPSBjbGllbnRYIC0gdGhpcy5kcmFnU3RhcnRYO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kcmFnT2Zmc2V0WSA9IGNsaWVudFkgLSB0aGlzLmRyYWdTdGFydFk7XHJcbiAgICAgICAgICAgICAgICBpbWcuc3R5bGUudHJhbnNmb3JtID0gYHRyYW5zbGF0ZSgke3RoaXMuZHJhZ09mZnNldFh9cHgsICR7dGhpcy5kcmFnT2Zmc2V0WX1weCkgc2NhbGUoJHt0aGlzLnpvb21MZXZlbH0pYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgZW5kRHJhZyA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5pc0RyYWdnaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGltYWdlQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2RyYWdnaW5nJyk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBNb3VzZSBldmVudHMgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0Mlx1MDQzMFx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQ0RlxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZG93bicsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLmJ1dHRvbiA9PT0gMCkgeyAvLyBcdTA0MUJcdTA0MzVcdTA0MzJcdTA0MzBcdTA0NEYgXHUwNDNBXHUwNDNEXHUwNDNFXHUwNDNGXHUwNDNBXHUwNDMwIFx1MDQzQ1x1MDQ0Qlx1MDQ0OFx1MDQzOFxyXG4gICAgICAgICAgICAgICAgc3RhcnREcmFnKGUuY2xpZW50WCwgZS5jbGllbnRZKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbW92ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGRvRHJhZyhlLmNsaWVudFgsIGUuY2xpZW50WSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGVuZERyYWcpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFRvdWNoIFx1MDQ0MVx1MDQzRVx1MDQzMVx1MDQ0Qlx1MDQ0Mlx1MDQzOFx1MDQ0RiBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDNDXHUwNDNFXHUwNDMxXHUwNDM4XHUwNDNCXHUwNDRDXHUwNDNEXHUwNDRCXHUwNDQ1IChcdTA0MzRcdTA0M0VcdTA0MzFcdTA0MzBcdTA0MzJcdTA0MzhcdTA0M0MgXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHUwNDRCIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0M0RcdTA0MzBcdTA0MzJcdTA0MzhcdTA0MzNcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzgpXHJcbiAgICAgICAgbGV0IGluaXRpYWxEaXN0YW5jZTogbnVtYmVyIHwgbnVsbCA9IG51bGw7XHJcbiAgICAgICAgbGV0IGluaXRpYWxUb3VjaGVzOiBUb3VjaExpc3QgfCBudWxsID0gbnVsbDtcclxuICAgICAgICBsZXQgaXNQaW5jaGluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoc3RhcnQnLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMikge1xyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDFEXHUwNDMwXHUwNDQ3XHUwNDMwXHUwNDNCXHUwNDNFIFx1MDQzNlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzMCBwaW5jaFxyXG4gICAgICAgICAgICAgICAgaXNQaW5jaGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsRGlzdGFuY2UgPSBNYXRoLmh5cG90KFxyXG4gICAgICAgICAgICAgICAgICAgIGUudG91Y2hlc1swXS5jbGllbnRYIC0gZS50b3VjaGVzWzFdLmNsaWVudFgsXHJcbiAgICAgICAgICAgICAgICAgICAgZS50b3VjaGVzWzBdLmNsaWVudFkgLSBlLnRvdWNoZXNbMV0uY2xpZW50WVxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxUb3VjaGVzID0gZS50b3VjaGVzO1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDEgJiYgdGhpcy56b29tTGV2ZWwgPiAxKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MURcdTA0MzBcdTA0NDdcdTA0MzBcdTA0M0JcdTA0M0UgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDQyXHUwNDMwXHUwNDQxXHUwNDNBXHUwNDM4XHUwNDMyXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQ0M1x1MDQzMlx1MDQzNVx1MDQzQlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQzRFx1MDQzRFx1MDQzRVx1MDQzM1x1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICAgICAgICAgIHN0YXJ0RHJhZyhlLnRvdWNoZXNbMF0uY2xpZW50WCwgZS50b3VjaGVzWzBdLmNsaWVudFkpO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGUudG91Y2hlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzRlx1MDQzRVx1MDQzQ1x1MDQzOFx1MDQzRFx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0M0RcdTA0MzBcdTA0NDdcdTA0MzBcdTA0M0JcdTA0NENcdTA0M0RcdTA0NDNcdTA0NEUgXHUwNDQyXHUwNDNFXHUwNDQ3XHUwNDNBXHUwNDQzIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcdTA0MzBcclxuICAgICAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFggPSBlLnRvdWNoZXNbMF0uY2xpZW50WDtcclxuICAgICAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFkgPSBlLnRvdWNoZXNbMF0uY2xpZW50WTtcclxuICAgICAgICAgICAgICAgIHRoaXMudG91Y2hTdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc1N3aXBpbmcgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGltYWdlQ29udGFpbmVyLmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNobW92ZScsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChlLnRvdWNoZXMubGVuZ3RoID09PSAyICYmIGluaXRpYWxEaXN0YW5jZSAhPT0gbnVsbCAmJiBpbml0aWFsVG91Y2hlcyAmJiBpc1BpbmNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MTZcdTA0MzVcdTA0NDFcdTA0NDIgcGluY2ggem9vbVxyXG4gICAgICAgICAgICAgICAgY29uc3QgY3VycmVudERpc3RhbmNlID0gTWF0aC5oeXBvdChcclxuICAgICAgICAgICAgICAgICAgICBlLnRvdWNoZXNbMF0uY2xpZW50WCAtIGUudG91Y2hlc1sxXS5jbGllbnRYLFxyXG4gICAgICAgICAgICAgICAgICAgIGUudG91Y2hlc1swXS5jbGllbnRZIC0gZS50b3VjaGVzWzFdLmNsaWVudFlcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNjYWxlID0gY3VycmVudERpc3RhbmNlIC8gaW5pdGlhbERpc3RhbmNlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy56b29tTGV2ZWwgPSBNYXRoLm1heCgwLjUsIE1hdGgubWluKHRoaXMuem9vbUxldmVsICogc2NhbGUsIDUpKTtcclxuICAgICAgICAgICAgICAgIGluaXRpYWxEaXN0YW5jZSA9IGN1cnJlbnREaXN0YW5jZTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS50b3VjaGVzLmxlbmd0aCA9PT0gMSAmJiB0aGlzLmlzRHJhZ2dpbmcpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQ0Mlx1MDQzMFx1MDQ0MVx1MDQzQVx1MDQzOFx1MDQzMlx1MDQzMFx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0NDNcdTA0MzJcdTA0MzVcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzVcdTA0M0RcdTA0M0RcdTA0M0VcdTA0MzNcdTA0M0UgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHJcbiAgICAgICAgICAgICAgICBkb0RyYWcoZS50b3VjaGVzWzBdLmNsaWVudFgsIGUudG91Y2hlc1swXS5jbGllbnRZKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChlLnRvdWNoZXMubGVuZ3RoID09PSAxICYmIHRoaXMuem9vbUxldmVsID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUVcdTA0M0ZcdTA0NDBcdTA0MzVcdTA0MzRcdTA0MzVcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHJcbiAgICAgICAgICAgICAgICBjb25zdCB0b3VjaCA9IGUudG91Y2hlc1swXTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhWCA9IHRvdWNoLmNsaWVudFggLSB0aGlzLnRvdWNoU3RhcnRYO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsdGFZID0gdG91Y2guY2xpZW50WSAtIHRoaXMudG91Y2hTdGFydFk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxNVx1MDQ0MVx1MDQzQlx1MDQzOCBcdTA0MzRcdTA0MzJcdTA0MzhcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDNGXHUwNDNFIFx1MDQzM1x1MDQzRVx1MDQ0MFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzRFx1MDQ0Mlx1MDQzMFx1MDQzQlx1MDQzOCBcdTA0MzFcdTA0M0VcdTA0M0JcdTA0NENcdTA0NDhcdTA0MzUsIFx1MDQ0N1x1MDQzNVx1MDQzQyBcdTA0M0ZcdTA0M0UgXHUwNDMyXHUwNDM1XHUwNDQwXHUwNDQyXHUwNDM4XHUwNDNBXHUwNDMwXHUwNDNCXHUwNDM4LCBcdTA0NERcdTA0NDJcdTA0M0UgXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHJcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5hYnMoZGVsdGFYKSA+IE1hdGguYWJzKGRlbHRhWSkgJiYgTWF0aC5hYnMoZGVsdGFYKSA+IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc1N3aXBpbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFx1MDQyMVx1MDQzQlx1MDQzNVx1MDQzM1x1MDQzQVx1MDQzMCBcdTA0NDFcdTA0M0NcdTA0MzVcdTA0NDlcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0MzJcdTA0MzhcdTA0MzdcdTA0NDNcdTA0MzBcdTA0M0JcdTA0NENcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDQyXHUwNDNEXHUwNDNFXHUwNDM5IFx1MDQ0MVx1MDQzMlx1MDQ0Rlx1MDQzN1x1MDQzOFxyXG4gICAgICAgICAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSBgdHJhbnNsYXRlKCR7ZGVsdGFYICogMC41fXB4LCAwcHgpIHNjYWxlKDEpYDtcclxuICAgICAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICBcclxuICAgICAgICBpbWFnZUNvbnRhaW5lci5hZGRFdmVudExpc3RlbmVyKCd0b3VjaGVuZCcsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChpc1BpbmNoaW5nKSB7XHJcbiAgICAgICAgICAgICAgICBpc1BpbmNoaW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpbml0aWFsRGlzdGFuY2UgPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgaW5pdGlhbFRvdWNoZXMgPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBlbmREcmFnKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBpZiAodGhpcy56b29tTGV2ZWwgPT09IDEgJiYgIWlzUGluY2hpbmcgJiYgIXRoaXMuaXNEcmFnZ2luZykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgdG91Y2ggPSBlLmNoYW5nZWRUb3VjaGVzWzBdO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgZGVsdGFYID0gdG91Y2guY2xpZW50WCAtIHRoaXMudG91Y2hTdGFydFg7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBkZWx0YVkgPSB0b3VjaC5jbGllbnRZIC0gdGhpcy50b3VjaFN0YXJ0WTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGRlbHRhVGltZSA9IERhdGUubm93KCkgLSB0aGlzLnRvdWNoU3RhcnRUaW1lO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUVcdTA0M0ZcdTA0NDBcdTA0MzVcdTA0MzRcdTA0MzVcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGXHJcbiAgICAgICAgICAgICAgICBjb25zdCBtaW5Td2lwZURpc3RhbmNlID0gNTA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBtYXhTd2lwZVRpbWUgPSAzMDA7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmlzU3dpcGluZyAmJiBNYXRoLmFicyhkZWx0YVgpID4gbWluU3dpcGVEaXN0YW5jZSAmJiBkZWx0YVRpbWUgPCBtYXhTd2lwZVRpbWUpIHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQyMVx1MDQzMlx1MDQzMFx1MDQzOVx1MDQzRiBcdTA0MzJcdTA0M0JcdTA0MzVcdTA0MzJcdTA0M0UgLSBcdTA0NDFcdTA0M0JcdTA0MzVcdTA0MzRcdTA0NDNcdTA0NEVcdTA0NDlcdTA0MzVcdTA0MzUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1XHJcbiAgICAgICAgICAgICAgICBpZiAoZGVsdGFYID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaEltYWdlKCdwcmV2Jyk7XHJcbiAgICAgICAgICAgICAgICB9IFxyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDMyXHUwNDMwXHUwNDM5XHUwNDNGIFx1MDQzMlx1MDQzRlx1MDQ0MFx1MDQzMFx1MDQzMlx1MDQzRSAtIFx1MDQzRlx1MDQ0MFx1MDQzNVx1MDQzNFx1MDQ0Qlx1MDQzNFx1MDQ0M1x1MDQ0OVx1MDQzNVx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzVcclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaEltYWdlKCduZXh0Jyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gXHUwNDIxXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDQxXHUwNDRCXHUwNDMyXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQ0MVx1MDQzQ1x1MDQzNVx1MDQ0OVx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICAgICAgICAgIGltZy5zdHlsZS50cmFuc2Zvcm0gPSAndHJhbnNsYXRlKDBweCwgMHB4KSBzY2FsZSgxKSc7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuaXNTd2lwaW5nID0gZmFsc2U7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFEXHUwNDMwXHUwNDMyXHUwNDM4XHUwNDMzXHUwNDMwXHUwNDQ2XHUwNDM4XHUwNDRGIFx1MDQzQVx1MDQzQlx1MDQzMFx1MDQzMlx1MDQzOFx1MDQ0OFx1MDQzMFx1MDQzQ1x1MDQzOFxyXG4gICAgICAgIGNvbnN0IGtleUhhbmRsZXIgPSAoZTogS2V5Ym9hcmRFdmVudCkgPT4ge1xyXG4gICAgICAgICAgICBpZiAoZS5rZXkgPT09ICdFc2NhcGUnKSB7XHJcbiAgICAgICAgICAgICAgICBjbG9zZUxpZ2h0Ym94KCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoaW1hZ2VzLmxlbmd0aCA+IDEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJ0Fycm93TGVmdCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2hJbWFnZSgncHJldicpOyAvLyBcdTA0MTFcdTA0NEJcdTA0M0JcdTA0M0UgJ25leHQnXHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGUua2V5ID09PSAnQXJyb3dSaWdodCcpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2hJbWFnZSgnbmV4dCcpOyAvLyBcdTA0MTFcdTA0NEJcdTA0M0JcdTA0M0UgJ3ByZXYnXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChlLmtleSA9PT0gJysnIHx8IGUua2V5ID09PSAnPScpIHtcclxuICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuem9vbUxldmVsID0gTWF0aC5taW4odGhpcy56b29tTGV2ZWwgKiAxLjIsIDUpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICctJyB8fCBlLmtleSA9PT0gJ18nKSB7XHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnpvb21MZXZlbCA9IE1hdGgubWF4KHRoaXMuem9vbUxldmVsIC8gMS4yLCAwLjUpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoJHt0aGlzLmRyYWdPZmZzZXRYfXB4LCAke3RoaXMuZHJhZ09mZnNldFl9cHgpIHNjYWxlKCR7dGhpcy56b29tTGV2ZWx9KWA7XHJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoZS5rZXkgPT09ICcwJykge1xyXG4gICAgICAgICAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNldFpvb21BbmRQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9IGB0cmFuc2xhdGUoMHB4LCAwcHgpIHNjYWxlKDEpYDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGtleUhhbmRsZXIpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQ0Mlx1MDQzOFx1MDQzNSBcdTA0M0ZcdTA0M0UgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDQzIFx1MDQzRFx1MDQzMCBiYWNrZHJvcCAoXHUwNDNCXHUwNDRFXHUwNDMxXHUwNDQzXHUwNDRFIFx1MDQzRVx1MDQzMVx1MDQzQlx1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0QylcclxuICAgICAgICBiYWNrZHJvcC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChlKSA9PiB7XHJcbiAgICAgICAgICAgIC8vIFx1MDQxN1x1MDQzMFx1MDQzQVx1MDQ0MFx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDJcdTA0M0VcdTA0M0JcdTA0NENcdTA0M0FcdTA0M0UgXHUwNDM1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQSBcdTA0MzFcdTA0NEJcdTA0M0IgXHUwNDNEXHUwNDM1IFx1MDQzRFx1MDQzMCBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDJcdTA0MzBcdTA0NDUgXHUwNDQzXHUwNDNGXHUwNDQwXHUwNDMwXHUwNDMyXHUwNDNCXHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGIFx1MDQzOCBcdTA0M0RcdTA0MzUgXHUwNDNEXHUwNDMwIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOCBcdTA0M0ZcdTA0NDBcdTA0MzggXHUwNDM3XHUwNDQzXHUwNDNDXHUwNDM1ID0gMVxyXG4gICAgICAgICAgICBjb25zdCB0YXJnZXQgPSBlLnRhcmdldCBhcyBIVE1MRWxlbWVudDtcclxuICAgICAgICAgICAgaWYgKHRhcmdldCA9PT0gYmFja2Ryb3AgfHwgXHJcbiAgICAgICAgICAgICAgICAodGFyZ2V0ID09PSBpbWFnZUNvbnRhaW5lciAmJiB0aGlzLnpvb21MZXZlbCA9PT0gMSkgfHxcclxuICAgICAgICAgICAgICAgICh0YXJnZXQgPT09IGltZyAmJiB0aGlzLnpvb21MZXZlbCA9PT0gMSkpIHtcclxuICAgICAgICAgICAgICAgIGNsb3NlTGlnaHRib3goKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQxMFx1MDQzRFx1MDQzOFx1MDQzQ1x1MDQzMFx1MDQ0Nlx1MDQzOFx1MDQ0RiBcdTA0M0ZcdTA0M0VcdTA0NEZcdTA0MzJcdTA0M0JcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICBzZXRUaW1lb3V0KCgpID0+IGJhY2tkcm9wLmNsYXNzTGlzdC5hZGQoJ2luJyksIDEwKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUZcdTA0M0VcdTA0M0FcdTA0MzBcdTA0MzdcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDMyXHUwNDNFXHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNVxyXG4gICAgICAgIHRoaXMudXBkYXRlTGlnaHRib3hJbWFnZShpbWFnZXMsIHN0YXJ0SW5kZXgsIGltZywgY291bnRlciwgdGh1bWJzKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSBjbG9zZUxpZ2h0Ym94KCkge1xyXG4gICAgICAgIGlmICh0aGlzLmFjdGl2ZUxpZ2h0Ym94KSB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQodGhpcy5hY3RpdmVMaWdodGJveCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZlTGlnaHRib3ggPSBudWxsO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLm92ZXJmbG93ID0gJyc7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIGNyZWF0ZUJ1dHRvbih0ZXh0OiBzdHJpbmcsIGNsYXNzTmFtZTogc3RyaW5nKTogSFRNTEJ1dHRvbkVsZW1lbnQge1xyXG4gICAgICAgIGNvbnN0IGJ0biA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2J1dHRvbicpO1xyXG4gICAgICAgIGJ0bi5jbGFzc05hbWUgPSBjbGFzc05hbWU7XHJcbiAgICAgICAgYnRuLmlubmVySFRNTCA9IHRleHQ7XHJcbiAgICAgICAgcmV0dXJuIGJ0bjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSB1cGRhdGVMaWdodGJveEltYWdlKFxyXG4gICAgICAgIGltYWdlczogQXJyYXk8e3NyYzogc3RyaW5nLCBhbHQ6IHN0cmluZ30+LCBcclxuICAgICAgICBpbmRleDogbnVtYmVyLCBcclxuICAgICAgICBpbWc6IEhUTUxJbWFnZUVsZW1lbnQsIFxyXG4gICAgICAgIGNvdW50ZXI6IEhUTUxFbGVtZW50LFxyXG4gICAgICAgIHRodW1iczogSFRNTEltYWdlRWxlbWVudFtdXHJcbiAgICApIHtcclxuICAgICAgICBpbWcuc3JjID0gaW1hZ2VzW2luZGV4XS5zcmM7XHJcbiAgICAgICAgaW1nLmFsdCA9IGltYWdlc1tpbmRleF0uYWx0O1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyMVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQ0MVx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0NDJcdTA0NDBcdTA0MzBcdTA0M0RcdTA0NDFcdTA0NDRcdTA0M0VcdTA0NDBcdTA0M0NcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzggXHUwNDNGXHUwNDQwXHUwNDM4IFx1MDQ0MVx1MDQzQ1x1MDQzNVx1MDQzRFx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcclxuICAgICAgICB0aGlzLnJlc2V0Wm9vbUFuZFBvc2l0aW9uKCk7XHJcbiAgICAgICAgaW1nLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUoMHB4LCAwcHgpIHNjYWxlKDEpJztcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0M0RcdTA0M0VcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDQxXHUwNDQ3XHUwNDM1XHUwNDQyXHUwNDQ3XHUwNDM4XHUwNDNBXHJcbiAgICAgICAgY291bnRlci50ZXh0Q29udGVudCA9IGAke2luZGV4ICsgMX0gLyAke2ltYWdlcy5sZW5ndGh9YDtcclxuICAgICAgICBcclxuICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0M0RcdTA0M0VcdTA0MzJcdTA0M0JcdTA0NEZcdTA0MzVcdTA0M0MgXHUwNDMwXHUwNDNBXHUwNDQyXHUwNDM4XHUwNDMyXHUwNDNEXHUwNDQzXHUwNDRFIFx1MDQzQ1x1MDQzOFx1MDQzRFx1MDQzOFx1MDQzMFx1MDQ0Mlx1MDQ0RVx1MDQ0MFx1MDQ0M1xyXG4gICAgICAgIHRodW1icy5mb3JFYWNoKCh0aHVtYiwgaSkgPT4ge1xyXG4gICAgICAgICAgICB0aHVtYi5jbGFzc0xpc3QudG9nZ2xlKCdhY3RpdmUnLCBpID09PSBpbmRleCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHByaXZhdGUgcmVzZXRab29tQW5kUG9zaXRpb24oKSB7XHJcbiAgICAgICAgdGhpcy56b29tTGV2ZWwgPSAxO1xyXG4gICAgICAgIHRoaXMuZHJhZ09mZnNldFggPSAwO1xyXG4gICAgICAgIHRoaXMuZHJhZ09mZnNldFkgPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIHNldHVwSW5kaXZpZHVhbEltYWdlcygpIHtcclxuICAgICAgICAvLyBcdTA0MUVcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0EgXHUwNDM0XHUwNDNCXHUwNDRGIFx1MDQzRVx1MDQ0Mlx1MDQzNFx1MDQzNVx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQ0Qlx1MDQ0NSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzkgXHUwNDMyIFx1MDQzN1x1MDQzMFx1MDQzQ1x1MDQzNVx1MDQ0Mlx1MDQzQVx1MDQzNVxyXG4gICAgICAgIHRoaXMucmVnaXN0ZXJEb21FdmVudChkb2N1bWVudCwgJ2NsaWNrJywgKGU6IE1vdXNlRXZlbnQpID0+IHtcclxuICAgICAgICAgICAgY29uc3QgdGFyZ2V0ID0gZS50YXJnZXQgYXMgSFRNTEVsZW1lbnQ7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MUZcdTA0NDBcdTA0M0VcdTA0M0ZcdTA0NDNcdTA0NDFcdTA0M0FcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDM4IFx1MDQzRFx1MDQzMCBcdTA0NERcdTA0M0JcdTA0MzVcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDJcdTA0MzBcdTA0NDUgXHUwNDNCXHUwNDMwXHUwNDM5XHUwNDQyXHUwNDMxXHUwNDNFXHUwNDNBXHUwNDQxXHUwNDMwXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQuY2xvc2VzdCgnLmxnLWJhY2tkcm9wJykgfHwgXHJcbiAgICAgICAgICAgICAgICB0YXJnZXQuY2xvc2VzdCgnLmxnLWJ0bicpIHx8IFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LmNsb3Nlc3QoJy5sZy10aHVtYm5haWwnKSB8fFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LmNsb3Nlc3QoJy5sZy16b29tLWNvbnRyb2xzJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDFGXHUwNDQwXHUwNDNFXHUwNDNGXHUwNDQzXHUwNDQxXHUwNDNBXHUwNDMwXHUwNDM1XHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQzOFx1MDQzQVx1MDQzOCBcdTA0M0RcdTA0MzAgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDRGXHUwNDQ1IFx1MDQzMiBcdTA0MzNcdTA0MzBcdTA0M0JcdTA0MzVcdTA0NDBcdTA0MzVcdTA0MzVcclxuICAgICAgICAgICAgaWYgKHRhcmdldC5jbG9zZXN0KCcuZ2FsbGVyeS1pdGVtJykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8gXHUwNDE4XHUwNDQ5XHUwNDM1XHUwNDNDIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNSwgXHUwNDNEXHUwNDMwIFx1MDQzQVx1MDQzRVx1MDQ0Mlx1MDQzRVx1MDQ0MFx1MDQzRVx1MDQzNSBcdTA0M0FcdTA0M0JcdTA0MzhcdTA0M0FcdTA0M0RcdTA0NDNcdTA0M0JcdTA0MzhcclxuICAgICAgICAgICAgbGV0IGltZ0VsZW1lbnQ6IEhUTUxJbWFnZUVsZW1lbnQgfCBudWxsID0gbnVsbDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQudGFnTmFtZSA9PT0gJ0lNRycpIHtcclxuICAgICAgICAgICAgICAgIGltZ0VsZW1lbnQgPSB0YXJnZXQgYXMgSFRNTEltYWdlRWxlbWVudDtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICh0YXJnZXQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpbnRlcm5hbC1lbWJlZCcpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MTRcdTA0M0JcdTA0NEYgXHUwNDMyXHUwNDNEXHUwNDQzXHUwNDQyXHUwNDQwXHUwNDM1XHUwNDNEXHUwNDNEXHUwNDM4XHUwNDQ1IGVtYmVkIFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzOSBPYnNpZGlhblxyXG4gICAgICAgICAgICAgICAgaW1nRWxlbWVudCA9IHRhcmdldC5xdWVyeVNlbGVjdG9yKCdpbWcnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKCFpbWdFbGVtZW50KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIFx1MDQxRlx1MDQ0MFx1MDQzRVx1MDQzMlx1MDQzNVx1MDQ0MFx1MDQ0Rlx1MDQzNVx1MDQzQywgXHUwNDQ3XHUwNDQyXHUwNDNFIFx1MDQ0RFx1MDQ0Mlx1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDM4XHUwNDM3IFx1MDQzN1x1MDQzMFx1MDQzQ1x1MDQzNVx1MDQ0Mlx1MDQzQVx1MDQzOCAoXHUwNDNEXHUwNDM1IFx1MDQ0N1x1MDQzMFx1MDQ0MVx1MDQ0Mlx1MDQ0QyBcdTA0MzhcdTA0M0RcdTA0NDJcdTA0MzVcdTA0NDBcdTA0NDRcdTA0MzVcdTA0MzlcdTA0NDFcdTA0MzAgT2JzaWRpYW4pXHJcbiAgICAgICAgICAgIGNvbnN0IGlzTm90ZUltYWdlID0gaW1nRWxlbWVudC5jbG9zZXN0KCcubWFya2Rvd24tc291cmNlLXZpZXcsIC5tYXJrZG93bi1wcmV2aWV3LXZpZXcnKTtcclxuICAgICAgICAgICAgaWYgKCFpc05vdGVJbWFnZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MUZcdTA0M0VcdTA0M0JcdTA0NDNcdTA0NDdcdTA0MzBcdTA0MzVcdTA0M0Mgc3JjIFx1MDQzOCBhbHRcclxuICAgICAgICAgICAgY29uc3Qgc3JjID0gaW1nRWxlbWVudC5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xyXG4gICAgICAgICAgICBjb25zdCBhbHQgPSBpbWdFbGVtZW50LmdldEF0dHJpYnV0ZSgnYWx0JykgfHwgJyc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyBcdTA0MUZcdTA0NDBcdTA0M0VcdTA0MzJcdTA0MzVcdTA0NDBcdTA0NEZcdTA0MzVcdTA0M0MsIFx1MDQ0N1x1MDQ0Mlx1MDQzRSBzcmMgXHUwNDQxXHUwNDQzXHUwNDQ5XHUwNDM1XHUwNDQxXHUwNDQyXHUwNDMyXHUwNDQzXHUwNDM1XHUwNDQyIFx1MDQzOCBcdTA0M0RcdTA0MzUgXHUwNDRGXHUwNDMyXHUwNDNCXHUwNDRGXHUwNDM1XHUwNDQyXHUwNDQxXHUwNDRGIGRhdGEtVVJJXHJcbiAgICAgICAgICAgIGlmIChzcmMgJiYgIXNyYy5zdGFydHNXaXRoKCdkYXRhOicpICYmICFzcmMuaW5jbHVkZXMoJ2h0dHA6Ly8nKSAmJiAhc3JjLmluY2x1ZGVzKCdodHRwczovLycpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBcdTA0MUVcdTA0NDJcdTA0M0FcdTA0NDBcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0M0MgXHUwNDNCXHUwNDMwXHUwNDM5XHUwNDQyXHUwNDMxXHUwNDNFXHUwNDNBXHUwNDQxIFx1MDQ0MSBcdTA0M0VcdTA0MzRcdTA0M0RcdTA0MzhcdTA0M0MgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1XHUwNDNDXHJcbiAgICAgICAgICAgICAgICBlLnByZXZlbnREZWZhdWx0KCk7XHJcbiAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vcGVuTGlnaHRib3goW3sgc3JjLCBhbHQgfV0sIDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDIyXHUwNDMwXHUwNDNBXHUwNDM2XHUwNDM1IFx1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzMFx1MDQ0Mlx1MDQ0Qlx1MDQzMlx1MDQzMFx1MDQzNVx1MDQzQyBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDMyIE1hcmtkb3duIHByZXZpZXdcclxuICAgICAgICB0aGlzLnJlZ2lzdGVyTWFya2Rvd25Qb3N0UHJvY2Vzc29yKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGltYWdlcyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbCgnaW1nOm5vdCguZ2FsbGVyeS1pdGVtIGltZyknKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGltYWdlcy5mb3JFYWNoKChpbWcpID0+IHtcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0M0FcdTA0NDNcdTA0NDBcdTA0NDFcdTA0M0VcdTA0NDAgXHUwNDQzXHUwNDNBXHUwNDMwXHUwNDM3XHUwNDMwXHUwNDQyXHUwNDM1XHUwNDNCXHUwNDRGIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0MzhcdTA0M0RcdTA0MzRcdTA0MzhcdTA0M0FcdTA0MzBcdTA0NDZcdTA0MzhcdTA0MzhcclxuICAgICAgICAgICAgICAgIGltZy5zdHlsZS5jdXJzb3IgPSAnem9vbS1pbic7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIFx1MDQxNFx1MDQzRVx1MDQzMVx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzFcdTA0M0VcdTA0NDJcdTA0NDdcdTA0MzhcdTA0M0EgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDMwXHJcbiAgICAgICAgICAgICAgICBpbWcuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGUucHJldmVudERlZmF1bHQoKTtcclxuICAgICAgICAgICAgICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHNyYyA9IGltZy5nZXRBdHRyaWJ1dGUoJ3NyYycpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsdCA9IGltZy5nZXRBdHRyaWJ1dGUoJ2FsdCcpIHx8ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzcmMgJiYgIXNyYy5zdGFydHNXaXRoKCdkYXRhOicpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3BlbkxpZ2h0Ym94KFt7IHNyYywgYWx0IH1dLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGFzeW5jIGxvYWRTZXR0aW5ncygpIHtcclxuICAgICAgICB0aGlzLnNldHRpbmdzID0gT2JqZWN0LmFzc2lnbih7fSwgREVGQVVMVF9TRVRUSU5HUywgYXdhaXQgdGhpcy5sb2FkRGF0YSgpKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgYXN5bmMgc2F2ZVNldHRpbmdzKCkge1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2F2ZURhdGEodGhpcy5zZXR0aW5ncyk7XHJcbiAgICAgICAgdGhpcy51cGRhdGVEeW5hbWljU3R5bGVzKCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gXHUwNDFGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDMzXHUwNDM4XHUwNDQxXHUwNDQyXHUwNDQwXHUwNDM4XHUwNDQwXHUwNDQzXHUwNDM1XHUwNDNDIFx1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzMVx1MDQzRVx1MDQ0Mlx1MDQ0N1x1MDQzOFx1MDQzQSBcdTA0NDEgXHUwNDNEXHUwNDNFXHUwNDMyXHUwNDRCXHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQ0RVx1MDQ0N1x1MDQzNVx1MDQzMlx1MDQ0Qlx1MDQzQyBcdTA0NDFcdTA0M0JcdTA0M0VcdTA0MzJcdTA0M0VcdTA0M0NcclxuICAgICAgICB0aGlzLmFwcC53b3Jrc3BhY2Uub2ZmKCdmaWxlLW9wZW4nLCAoKSA9PiB7fSk7XHJcbiAgICAgICAgdGhpcy5yZWdpc3Rlck1hcmtkb3duQ29kZUJsb2NrUHJvY2Vzc29yKHRoaXMuc2V0dGluZ3MuZ2FsbGVyeUtleXdvcmQsIGFzeW5jIChzb3VyY2UsIGVsLCBjdHgpID0+IHtcclxuICAgICAgICAgICAgYXdhaXQgdGhpcy5yZW5kZXJHYWxsZXJ5KHNvdXJjZSwgZWwsIGN0eCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5yZWZyZXNoQWxsR2FsbGVyaWVzKCk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHJlZnJlc2hBbGxHYWxsZXJpZXMoKSB7XHJcbiAgICAgICAgY29uc3QgZ2FsbGVyeUNvbnRhaW5lcnMgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKCcuZ2FsbGVyeS1jb250YWluZXInKTtcclxuICAgICAgICBnYWxsZXJ5Q29udGFpbmVycy5mb3JFYWNoKGNvbnRhaW5lciA9PiB7XHJcbiAgICAgICAgICAgIGNvbnN0IGdyaWQgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcignLmdhbGxlcnktZ3JpZCcpO1xyXG4gICAgICAgICAgICBpZiAoZ3JpZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSBncmlkLnF1ZXJ5U2VsZWN0b3JBbGwoJy5nYWxsZXJ5LWl0ZW0nKTtcclxuICAgICAgICAgICAgICAgIGdyaWQuc3R5bGUuc2V0UHJvcGVydHkoJy0taW1hZ2UtY291bnQnLCBpdGVtcy5sZW5ndGgudG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgb251bmxvYWQoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1VubG9hZGluZyBJbWFnZSBHYWxsZXJ5IHBsdWdpbicpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFx1MDQyM1x1MDQzNFx1MDQzMFx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQzQyBcdTA0NDFcdTA0NDJcdTA0MzhcdTA0M0JcdTA0MzhcclxuICAgICAgICBjb25zdCBzdGF0aWNTdHlsZUVsID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ29ic2lkaWFuLWdhbGxlcnktc3RhdGljLXN0eWxlcycpO1xyXG4gICAgICAgIGlmIChzdGF0aWNTdHlsZUVsKSB7XHJcbiAgICAgICAgICAgIHN0YXRpY1N0eWxlRWwucmVtb3ZlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICh0aGlzLnN0eWxlRWwpIHtcclxuICAgICAgICAgICAgdGhpcy5zdHlsZUVsLnJlbW92ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNsb3NlTGlnaHRib3goKTtcclxuICAgIH1cclxufVxyXG5cclxuY2xhc3MgR2FsbGVyeVNldHRpbmdUYWIgZXh0ZW5kcyBQbHVnaW5TZXR0aW5nVGFiIHtcclxuICAgIHBsdWdpbjogSW1hZ2VHYWxsZXJ5UGx1Z2luO1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcihhcHA6IEFwcCwgcGx1Z2luOiBJbWFnZUdhbGxlcnlQbHVnaW4pIHtcclxuICAgICAgICBzdXBlcihhcHAsIHBsdWdpbik7XHJcbiAgICAgICAgdGhpcy5wbHVnaW4gPSBwbHVnaW47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGRpc3BsYXkoKTogdm9pZCB7XHJcbiAgICAgICAgY29uc3QgeyBjb250YWluZXJFbCB9ID0gdGhpcztcclxuICAgICAgICBjb250YWluZXJFbC5lbXB0eSgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMScsIHsgdGV4dDogJ05pY2UgR2FsbGVyeSBTZXR0aW5ncycgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc3QgbWFuaWZlc3QgPSAodGhpcy5wbHVnaW4gYXMgYW55KS5tYW5pZmVzdDtcclxuICAgICAgICBpZiAobWFuaWZlc3QgJiYgbWFuaWZlc3QudmVyc2lvbikge1xyXG4gICAgICAgICAgICBjb250YWluZXJFbC5jcmVhdGVFbCgncCcsIHsgXHJcbiAgICAgICAgICAgICAgICB0ZXh0OiBgJ1ZpYmUgY29kaW5nIGJ5IEBLb25mZXRpZ3IuIFZlcnNpb246ICR7bWFuaWZlc3QudmVyc2lvbn1gLFxyXG4gICAgICAgICAgICAgICAgY2xzOiAnZ2FsbGVyeS12ZXJzaW9uLWluZm8nXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0dhbGxlcnkga2V5d29yZC4gfCBcdTA0MUFcdTA0M0JcdTA0NEVcdTA0NDdcdTA0MzVcdTA0MzJcdTA0M0VcdTA0MzUgXHUwNDQxXHUwNDNCXHUwNDNFXHUwNDMyXHUwNDNFIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0M0VcdTA0MzFcdTA0NEFcdTA0NEZcdTA0MzJcdTA0M0JcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4JylcclxuICAgICAgICAgICAgLnNldERlc2MoJ0tleXdvcmQgZm9yIHRoZSBjb2RlIGJsb2NrIChlLmcuLCBcImdhbGxlcnlcIiwgXCJpbWFnZXNcIiwgXCJwaG90b3NcIikuJylcclxuICAgICAgICAgICAgLmFkZFRleHQodGV4dCA9PiB0ZXh0XHJcbiAgICAgICAgICAgICAgICAuc2V0UGxhY2Vob2xkZXIoJ2dhbGxlcnknKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLmdhbGxlcnlLZXl3b3JkKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLmdhbGxlcnlLZXl3b3JkID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29udGFpbmVyRWwuY3JlYXRlRWwoJ2gyJywgeyB0ZXh0OiAnTWF4aW11bSBjb2x1bW5zIG9uOiB8IFx1MDQyMVx1MDQzQVx1MDQzRVx1MDQzQlx1MDQ0Q1x1MDQzQVx1MDQzRSBcdTA0NDRcdTA0M0VcdTA0NDJcdTA0M0VcdTA0M0EgXHUwNDMyXHUwNDNDXHUwNDM1XHUwNDQxXHUwNDQyXHUwNDM4XHUwNDQyXHUwNDQxXHUwNDRGIFx1MDQzMiBcdTA0NDFcdTA0NDJcdTA0NDBcdTA0M0VcdTA0M0FcdTA0NDM6JyB9KTtcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0Rlc2t0b3AnKVxyXG4gICAgICAgICAgICAuc2V0RGVzYygnTWF4aW11bSBudW1iZXIgb2YgY29sdW1ucyBvbiBsYXJnZSBzY3JlZW5zIChcdTIyNjUxMDI0cHgpLiBBY3R1YWwgY29sdW1ucyB3aWxsIGFkanVzdCBiYXNlZCBvbiBpbWFnZSBjb3VudC4nKVxyXG4gICAgICAgICAgICAuYWRkU2xpZGVyKHNsaWRlciA9PiBzbGlkZXJcclxuICAgICAgICAgICAgICAgIC5zZXRMaW1pdHMoMSwgOCwgMSlcclxuICAgICAgICAgICAgICAgIC5zZXRWYWx1ZSh0aGlzLnBsdWdpbi5zZXR0aW5ncy5tYXhDb2x1bW5zRGVza3RvcClcclxuICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpXHJcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4Q29sdW1uc0Rlc2t0b3AgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICBcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ1RhYmxldCcpXHJcbiAgICAgICAgICAgIC5zZXREZXNjKCdNYXhpbXVtIG51bWJlciBvZiBjb2x1bW5zIG9uIG1lZGl1bSBzY3JlZW5zICg3NjhweC0xMDIzcHgpJylcclxuICAgICAgICAgICAgLmFkZFNsaWRlcihzbGlkZXIgPT4gc2xpZGVyXHJcbiAgICAgICAgICAgICAgICAuc2V0TGltaXRzKDEsIDYsIDEpXHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4Q29sdW1uc1RhYmxldClcclxuICAgICAgICAgICAgICAgIC5zZXREeW5hbWljVG9vbHRpcCgpXHJcbiAgICAgICAgICAgICAgICAub25DaGFuZ2UoYXN5bmMgKHZhbHVlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wbHVnaW4uc2V0dGluZ3MubWF4Q29sdW1uc1RhYmxldCA9IHZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMucGx1Z2luLnNhdmVTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfSkpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIG5ldyBTZXR0aW5nKGNvbnRhaW5lckVsKVxyXG4gICAgICAgICAgICAuc2V0TmFtZSgnTW9iaWxlJylcclxuICAgICAgICAgICAgLnNldERlc2MoJ01heGltdW0gbnVtYmVyIG9mIGNvbHVtbnMgb24gc21hbGwgc2NyZWVucyAoPDc2OHB4KScpXHJcbiAgICAgICAgICAgIC5hZGRTbGlkZXIoc2xpZGVyID0+IHNsaWRlclxyXG4gICAgICAgICAgICAgICAgLnNldExpbWl0cygxLCA0LCAxKVxyXG4gICAgICAgICAgICAgICAgLnNldFZhbHVlKHRoaXMucGx1Z2luLnNldHRpbmdzLm1heENvbHVtbnNNb2JpbGUpXHJcbiAgICAgICAgICAgICAgICAuc2V0RHluYW1pY1Rvb2x0aXAoKVxyXG4gICAgICAgICAgICAgICAgLm9uQ2hhbmdlKGFzeW5jICh2YWx1ZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucGx1Z2luLnNldHRpbmdzLm1heENvbHVtbnNNb2JpbGUgPSB2YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLnBsdWdpbi5zYXZlU2V0dGluZ3MoKTtcclxuICAgICAgICAgICAgICAgIH0pKTtcclxuICAgICAgICBcclxuICAgICAgICBuZXcgU2V0dGluZyhjb250YWluZXJFbClcclxuICAgICAgICAgICAgLnNldE5hbWUoJ0dhcCBiZXR3ZWVuIGltYWdlcyB8IFx1MDQyMFx1MDQzMFx1MDQ0MVx1MDQ0MVx1MDQ0Mlx1MDQzRVx1MDQ0Rlx1MDQzRFx1MDQzOFx1MDQzNSBcdTA0M0NcdTA0MzVcdTA0MzZcdTA0MzRcdTA0NDMgXHUwNDQ0XHUwNDNFXHUwNDQyXHUwNDNBXHUwNDMwXHUwNDNDXHUwNDM4JylcclxuICAgICAgICAgICAgLnNldERlc2MoJ1NwYWNlIGJldHdlZW4gdGh1bWJuYWlscyAoZS5nLiwgMTJweCwgMXJlbSknKVxyXG4gICAgICAgICAgICAuYWRkVGV4dCh0ZXh0ID0+IHRleHRcclxuICAgICAgICAgICAgICAgIC5zZXRQbGFjZWhvbGRlcignMTJweCcpXHJcbiAgICAgICAgICAgICAgICAuc2V0VmFsdWUodGhpcy5wbHVnaW4uc2V0dGluZ3MuZ2FwU2l6ZSlcclxuICAgICAgICAgICAgICAgIC5vbkNoYW5nZShhc3luYyAodmFsdWUpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnBsdWdpbi5zZXR0aW5ncy5nYXBTaXplID0gdmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5wbHVnaW4uc2F2ZVNldHRpbmdzKCk7XHJcbiAgICAgICAgICAgICAgICB9KSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gQWRkIGRvY3VtZW50YXRpb24gc2VjdGlvblxyXG4gICAgICAgIGNvbnRhaW5lckVsLmNyZWF0ZUVsKCdoMycsIHsgdGV4dDogJ0RvY3VtZW50YXRpb24gLyBcdTA0MTRcdTA0M0VcdTA0M0FcdTA0NDNcdTA0M0NcdTA0MzVcdTA0M0RcdTA0NDJcdTA0MzBcdTA0NDZcdTA0MzhcdTA0NEYnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGRvY0NvbnRhaW5lciA9IGNvbnRhaW5lckVsLmNyZWF0ZURpdih7IGNsczogJ2dhbGxlcnktZG9jLWNvbnRhaW5lcicgfSk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRW5nbGlzaCBkb2N1bWVudGF0aW9uXHJcbiAgICAgICAgY29uc3QgZW5Eb2MgPSBkb2NDb250YWluZXIuY3JlYXRlRGl2KHsgY2xzOiAnZ2FsbGVyeS1kb2Mtc2VjdGlvbicgfSk7XHJcbiAgICAgICAgZW5Eb2MuY3JlYXRlRWwoJ2g0JywgeyB0ZXh0OiAnXHVEODNEXHVEQ0Q2IEhvdyB0byB1c2UgdGhlIEdhbGxlcnkgUGx1Z2luJyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBlbkRvYy5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1RoZSBwbHVnaW4gcHJvdmlkZXMgdHdvIHdheXMgdG8gdmlldyBpbWFnZXM6JyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBlbkxpc3QgPSBlbkRvYy5jcmVhdGVFbCgndWwnKTtcclxuICAgICAgICBlbkxpc3QuY3JlYXRlRWwoJ2xpJykuaW5uZXJIVE1MID0gJzxzdHJvbmc+SW5kaXZpZHVhbCBpbWFnZXM6PC9zdHJvbmc+IENsaWNrIG9uIGFueSBpbWFnZSBpbiB5b3VyIG5vdGUgdG8gb3BlbiBpdCBpbiBhIGxpZ2h0Ym94IHZpZXdlciB3aXRoIHpvb20gYW5kIHBhbiBmdW5jdGlvbmFsaXR5Lic7XHJcbiAgICAgICAgZW5MaXN0LmNyZWF0ZUVsKCdsaScpLmlubmVySFRNTCA9ICc8c3Ryb25nPkltYWdlIGdhbGxlcmllczo8L3N0cm9uZz4gQ3JlYXRlIGdhbGxlcmllcyB1c2luZyBjb2RlIGJsb2NrcyB3aXRoIHlvdXIgY2hvc2VuIGtleXdvcmQuJztcclxuICAgICAgICBcclxuICAgICAgICBlbkRvYy5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1RvIGNyZWF0ZSBhIGdhbGxlcnksIHVzZSBhIGNvZGUgYmxvY2sgd2l0aCB5b3VyIGdhbGxlcnkga2V5d29yZDonIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGNvbnN0IGVuRXhhbXBsZSA9IGVuRG9jLmNyZWF0ZUVsKCdwcmUnKTtcclxuICAgICAgICBlbkV4YW1wbGUuc3R5bGUuY3NzVGV4dCA9ICdiYWNrZ3JvdW5kOiB2YXIoLS1iYWNrZ3JvdW5kLXNlY29uZGFyeSk7IHBhZGRpbmc6IDEwcHg7IGJvcmRlci1yYWRpdXM6IDVweDsgb3ZlcmZsb3cteDogYXV0bzsnO1xyXG4gICAgICAgIGVuRXhhbXBsZS5jcmVhdGVFbCgnY29kZScpLmlubmVyVGV4dCA9IGBcXGBcXGBcXGBnYWxsZXJ5XHJcbiFbW2ltYWdlMS5qcGddXVxyXG4hW1tpbWFnZTIucG5nfE9wdGlvbmFsIGNhcHRpb25dXVxyXG4hW1twaG90bzMuanBnXV1cclxuIVtbc2NyZWVuc2hvdC5wbmd8QW5vdGhlciBpbWFnZSB3aXRoIGNhcHRpb25dXVxyXG5cXGBcXGBcXGBgO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGVuRG9jLmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiAnR2FsbGVyeSBmZWF0dXJlczonIH0pO1xyXG4gICAgICAgIGNvbnN0IGVuRmVhdHVyZXMgPSBlbkRvYy5jcmVhdGVFbCgndWwnKTtcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdDbGljayBvbiBhbnkgdGh1bWJuYWlsIHRvIG9wZW4gdGhlIGxpZ2h0Ym94JztcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdOYXZpZ2F0ZSBiZXR3ZWVuIGltYWdlcyB3aXRoIGFycm93IGtleXMgb3Igc3dpcGUnO1xyXG4gICAgICAgIGVuRmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1pvb20gd2l0aCBtb3VzZSB3aGVlbCwgcGluY2ggZ2VzdHVyZSc7XHJcbiAgICAgICAgZW5GZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnUGFuIGJ5IGRyYWdnaW5nIHdoZW4gem9vbWVkIGluJztcclxuICAgICAgICBlbkZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdEb3VibGUtY2xpY2svdGFwIHRvIHJlc2V0IHpvb20nO1xyXG4gICAgICAgIGVuRmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1ByZXNzIEVzY2FwZSB0byBjbG9zZSB0aGUgbGlnaHRib3gnO1xyXG4gICAgICAgIGVuRmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ0lmIHRoZSBwaG90byBpcyB6b29tZWQgaW4sIHRoZSBsaWdodGJveCB3aWxsIG5vdCBjbG9zZSBieSBjbGlja2luZyBvbiB0aGUgaW1hZ2UuIERvdWJsZS10YXAgdG8gcmVzZXQgdGhlIHpvb20nO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFJ1c3NpYW4gZG9jdW1lbnRhdGlvblxyXG4gICAgICAgIGNvbnN0IHJ1RG9jID0gZG9jQ29udGFpbmVyLmNyZWF0ZURpdih7IGNsczogJ2dhbGxlcnktZG9jLXNlY3Rpb24nIH0pO1xyXG4gICAgICAgIHJ1RG9jLmNyZWF0ZUVsKCdoNCcsIHsgdGV4dDogJ1x1RDgzRFx1RENENiBcdTA0MUFcdTA0MzBcdTA0M0EgXHUwNDM4XHUwNDQxXHUwNDNGXHUwNDNFXHUwNDNCXHUwNDRDXHUwNDM3XHUwNDNFXHUwNDMyXHUwNDMwXHUwNDQyXHUwNDRDIFx1MDQzRlx1MDQzQlx1MDQzMFx1MDQzM1x1MDQzOFx1MDQzRCBcdTA0MTNcdTA0MzBcdTA0M0JcdTA0MzVcdTA0NDBcdTA0MzVcdTA0NEYnIH0pO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHJ1RG9jLmNyZWF0ZUVsKCdwJywgeyB0ZXh0OiAnXHUwNDFGXHUwNDNCXHUwNDMwXHUwNDMzXHUwNDM4XHUwNDNEIFx1MDQzRlx1MDQ0MFx1MDQzNVx1MDQzNFx1MDQzRVx1MDQ0MVx1MDQ0Mlx1MDQzMFx1MDQzMlx1MDQzQlx1MDQ0Rlx1MDQzNVx1MDQ0MiBcdTA0MzRcdTA0MzJcdTA0MzAgXHUwNDQxXHUwNDNGXHUwNDNFXHUwNDQxXHUwNDNFXHUwNDMxXHUwNDMwIFx1MDQzRlx1MDQ0MFx1MDQzRVx1MDQ0MVx1MDQzQ1x1MDQzRVx1MDQ0Mlx1MDQ0MFx1MDQzMCBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0Mzk6JyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBydUxpc3QgPSBydURvYy5jcmVhdGVFbCgndWwnKTtcclxuICAgICAgICBydUxpc3QuY3JlYXRlRWwoJ2xpJykuaW5uZXJIVE1MID0gJzxzdHJvbmc+XHUwNDFFXHUwNDQyXHUwNDM0XHUwNDM1XHUwNDNCXHUwNDRDXHUwNDNEXHUwNDRCXHUwNDM1IFx1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0Rjo8L3N0cm9uZz4gXHUwNDFBXHUwNDNCXHUwNDM4XHUwNDNBXHUwNDNEXHUwNDM4XHUwNDQyXHUwNDM1IFx1MDQzRFx1MDQzMCBcdTA0M0JcdTA0NEVcdTA0MzFcdTA0M0VcdTA0MzUgXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM1IFx1MDQzMiBcdTA0MzdcdTA0MzBcdTA0M0NcdTA0MzVcdTA0NDJcdTA0M0FcdTA0MzUsIFx1MDQ0N1x1MDQ0Mlx1MDQzRVx1MDQzMVx1MDQ0QiBcdTA0M0VcdTA0NDJcdTA0M0FcdTA0NDBcdTA0NEJcdTA0NDJcdTA0NEMgXHUwNDM1XHUwNDMzXHUwNDNFIFx1MDQzMiBcdTA0M0JcdTA0MzBcdTA0MzlcdTA0NDJcdTA0MzFcdTA0M0VcdTA0M0FcdTA0NDFcdTA0MzUgXHUwNDQxIFx1MDQzMlx1MDQzRVx1MDQzN1x1MDQzQ1x1MDQzRVx1MDQzNlx1MDQzRFx1MDQzRVx1MDQ0MVx1MDQ0Mlx1MDQ0Q1x1MDQ0RSBcdTA0NDNcdTA0MzJcdTA0MzVcdTA0M0JcdTA0MzhcdTA0NDdcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEYgXHUwNDM4IFx1MDQzRlx1MDQzNVx1MDQ0MFx1MDQzNVx1MDQzQ1x1MDQzNVx1MDQ0OVx1MDQzNVx1MDQzRFx1MDQzOFx1MDQ0Ri4nO1xyXG4gICAgICAgIHJ1TGlzdC5jcmVhdGVFbCgnbGknKS5pbm5lckhUTUwgPSAnPHN0cm9uZz5cdTA0MTNcdTA0MzBcdTA0M0JcdTA0MzVcdTA0NDBcdTA0MzVcdTA0MzggXHUwNDM4XHUwNDM3XHUwNDNFXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDM2XHUwNDM1XHUwNDNEXHUwNDM4XHUwNDM5Ojwvc3Ryb25nPiBcdTA0MjFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0MzJcdTA0MzBcdTA0MzlcdTA0NDJcdTA0MzUgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4IFx1MDQ0MSBcdTA0M0ZcdTA0M0VcdTA0M0NcdTA0M0VcdTA0NDlcdTA0NENcdTA0NEUgXHUwNDMxXHUwNDNCXHUwNDNFXHUwNDNBXHUwNDNFXHUwNDMyIFx1MDQzQVx1MDQzRVx1MDQzNFx1MDQzMCBcdTA0NDEgXHUwNDMyXHUwNDRCXHUwNDMxXHUwNDQwXHUwNDMwXHUwNDNEXHUwNDNEXHUwNDRCXHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQ0RVx1MDQ0N1x1MDQzNVx1MDQzMlx1MDQ0Qlx1MDQzQyBcdTA0NDFcdTA0M0JcdTA0M0VcdTA0MzJcdTA0M0VcdTA0M0MuJztcclxuICAgICAgICBcclxuICAgICAgICBydURvYy5jcmVhdGVFbCgncCcsIHsgdGV4dDogJ1x1MDQyN1x1MDQ0Mlx1MDQzRVx1MDQzMVx1MDQ0QiBcdTA0NDFcdTA0M0VcdTA0MzdcdTA0MzRcdTA0MzBcdTA0NDJcdTA0NEMgXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDRFLCBcdTA0MzhcdTA0NDFcdTA0M0ZcdTA0M0VcdTA0M0JcdTA0NENcdTA0MzdcdTA0NDNcdTA0MzlcdTA0NDJcdTA0MzUgXHUwNDMxXHUwNDNCXHUwNDNFXHUwNDNBIFx1MDQzQVx1MDQzRVx1MDQzNFx1MDQzMCBcdTA0NDEgXHUwNDMyXHUwNDMwXHUwNDQ4XHUwNDM4XHUwNDNDIFx1MDQzQVx1MDQzQlx1MDQ0RVx1MDQ0N1x1MDQzNVx1MDQzMlx1MDQ0Qlx1MDQzQyBcdTA0NDFcdTA0M0JcdTA0M0VcdTA0MzJcdTA0M0VcdTA0M0M6JyB9KTtcclxuICAgICAgICBcclxuICAgICAgICBjb25zdCBydUV4YW1wbGUgPSBydURvYy5jcmVhdGVFbCgncHJlJyk7XHJcbiAgICAgICAgcnVFeGFtcGxlLnN0eWxlLmNzc1RleHQgPSAnYmFja2dyb3VuZDogdmFyKC0tYmFja2dyb3VuZC1zZWNvbmRhcnkpOyBwYWRkaW5nOiAxMHB4OyBib3JkZXItcmFkaXVzOiA1cHg7IG92ZXJmbG93LXg6IGF1dG87JztcclxuICAgICAgICBydUV4YW1wbGUuY3JlYXRlRWwoJ2NvZGUnKS5pbm5lclRleHQgPSBgXFxgXFxgXFxgZ2FsbGVyeVxyXG4hW1tcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUxLmpwZ11dXHJcbiFbW1x1MDQzOFx1MDQzN1x1MDQzRVx1MDQzMVx1MDQ0MFx1MDQzMFx1MDQzNlx1MDQzNVx1MDQzRFx1MDQzOFx1MDQzNTIucG5nfFx1MDQxRFx1MDQzNVx1MDQzRVx1MDQzMVx1MDQ0Rlx1MDQzN1x1MDQzMFx1MDQ0Mlx1MDQzNVx1MDQzQlx1MDQ0Q1x1MDQzRFx1MDQzMFx1MDQ0RiBcdTA0M0ZcdTA0M0VcdTA0MzRcdTA0M0ZcdTA0MzhcdTA0NDFcdTA0NENdXVxyXG4hW1tcdTA0NDRcdTA0M0VcdTA0NDJcdTA0M0UzLmpwZ11dXHJcbiFbW1x1MDQ0MVx1MDQzQVx1MDQ0MFx1MDQzOFx1MDQzRFx1MDQ0OFx1MDQzRVx1MDQ0Mi5wbmd8XHUwNDE1XHUwNDQ5XHUwNDM1IFx1MDQzRVx1MDQzNFx1MDQzRFx1MDQzRSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDQxIFx1MDQzRlx1MDQzRVx1MDQzNFx1MDQzRlx1MDQzOFx1MDQ0MVx1MDQ0Q1x1MDQ0RV1dXHJcblxcYFxcYFxcYGA7XHJcbiAgICAgICAgXHJcbiAgICAgICAgcnVEb2MuY3JlYXRlRWwoJ3AnLCB7IHRleHQ6ICdcdTA0MTJcdTA0M0VcdTA0MzdcdTA0M0NcdTA0M0VcdTA0MzZcdTA0M0RcdTA0M0VcdTA0NDFcdTA0NDJcdTA0MzggXHUwNDMzXHUwNDMwXHUwNDNCXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDM4OicgfSk7XHJcbiAgICAgICAgY29uc3QgcnVGZWF0dXJlcyA9IHJ1RG9jLmNyZWF0ZUVsKCd1bCcpO1xyXG4gICAgICAgIHJ1RmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1x1MDQxQVx1MDQzQlx1MDQzOFx1MDQzQVx1MDQzRFx1MDQzOFx1MDQ0Mlx1MDQzNSBcdTA0M0RcdTA0MzAgXHUwNDNCXHUwNDRFXHUwNDMxXHUwNDQzXHUwNDRFIFx1MDQzQ1x1MDQzOFx1MDQzRFx1MDQzOFx1MDQzMFx1MDQ0Mlx1MDQ0RVx1MDQ0MFx1MDQ0MyBcdTA0MzRcdTA0M0JcdTA0NEYgXHUwNDNFXHUwNDQyXHUwNDNBXHUwNDQwXHUwNDRCXHUwNDQyXHUwNDM4XHUwNDRGIFx1MDQzQlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzMVx1MDQzRVx1MDQzQVx1MDQ0MVx1MDQzMCc7XHJcbiAgICAgICAgcnVGZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnXHUwNDFGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDQ5XHUwNDMwXHUwNDM5XHUwNDQyXHUwNDM1XHUwNDQxXHUwNDRDIFx1MDQzQ1x1MDQzNVx1MDQzNlx1MDQzNFx1MDQ0MyBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0NEZcdTA0M0NcdTA0MzggXHUwNDQxIFx1MDQzRlx1MDQzRVx1MDQzQ1x1MDQzRVx1MDQ0OVx1MDQ0Q1x1MDQ0RSBcdTA0M0FcdTA0M0JcdTA0MzBcdTA0MzJcdTA0MzhcdTA0NDgtXHUwNDQxXHUwNDQyXHUwNDQwXHUwNDM1XHUwNDNCXHUwNDNFXHUwNDNBIFx1MDQzOFx1MDQzQlx1MDQzOCBcdTA0NDFcdTA0MzJcdTA0MzBcdTA0MzlcdTA0M0ZcdTA0MzAnO1xyXG4gICAgICAgIHJ1RmVhdHVyZXMuY3JlYXRlRWwoJ2xpJykuaW5uZXJUZXh0ID0gJ1x1MDQyM1x1MDQzMlx1MDQzNVx1MDQzQlx1MDQzOFx1MDQ0N1x1MDQzOFx1MDQzMlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzNSBcdTA0NDEgXHUwNDNGXHUwNDNFXHUwNDNDXHUwNDNFXHUwNDQ5XHUwNDRDXHUwNDRFIFx1MDQzQVx1MDQzRVx1MDQzQlx1MDQzNVx1MDQ0MVx1MDQzOFx1MDQzQVx1MDQzMCBcdTA0M0NcdTA0NEJcdTA0NDhcdTA0MzgsIFx1MDQzNlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzMCBwaW5jaCc7XHJcbiAgICAgICAgcnVGZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnXHUwNDFGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDNDXHUwNDM1XHUwNDQ5XHUwNDMwXHUwNDM5XHUwNDQyXHUwNDM1IFx1MDQ0M1x1MDQzMlx1MDQzNVx1MDQzQlx1MDQzOFx1MDQ0N1x1MDQzNVx1MDQzRFx1MDQzRFx1MDQzRVx1MDQzNSBcdTA0MzhcdTA0MzdcdTA0M0VcdTA0MzFcdTA0NDBcdTA0MzBcdTA0MzZcdTA0MzVcdTA0M0RcdTA0MzhcdTA0MzUgXHUwNDNGXHUwNDM1XHUwNDQwXHUwNDM1XHUwNDQyXHUwNDMwXHUwNDQxXHUwNDNBXHUwNDM4XHUwNDMyXHUwNDMwXHUwNDNEXHUwNDM4XHUwNDM1XHUwNDNDJztcclxuICAgICAgICBydUZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdcdTA0MTRcdTA0MzJcdTA0M0VcdTA0MzlcdTA0M0RcdTA0M0VcdTA0MzkgXHUwNDNBXHUwNDNCXHUwNDM4XHUwNDNBL1x1MDQ0Mlx1MDQzMFx1MDQzRiBcdTA0NDFcdTA0MzFcdTA0NDBcdTA0MzBcdTA0NDFcdTA0NEJcdTA0MzJcdTA0MzBcdTA0MzVcdTA0NDIgXHUwNDNDXHUwNDMwXHUwNDQxXHUwNDQ4XHUwNDQyXHUwNDMwXHUwNDMxJztcclxuICAgICAgICBydUZlYXR1cmVzLmNyZWF0ZUVsKCdsaScpLmlubmVyVGV4dCA9ICdcdTA0MURcdTA0MzBcdTA0MzZcdTA0M0NcdTA0MzhcdTA0NDJcdTA0MzUgRXNjYXBlIFx1MDQzNFx1MDQzQlx1MDQ0RiBcdTA0MzdcdTA0MzBcdTA0M0FcdTA0NDBcdTA0NEJcdTA0NDJcdTA0MzhcdTA0NEYgXHUwNDNCXHUwNDMwXHUwNDM5XHUwNDQyXHUwNDMxXHUwNDNFXHUwNDNBXHUwNDQxXHUwNDMwIFx1MDQzOFx1MDQzQlx1MDQzOCBcdTA0M0RcdTA0MzAgXHUwNDNFXHUwNDQwXHUwNDM4XHUwNDMzXHUwNDM4XHUwNDNEXHUwNDMwXHUwNDNCXHUwNDRDXHUwNDNEXHUwNDNFXHUwNDNDIFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMVx1MDQzNSBcdTA0M0RcdTA0MzBcdTA0MzZcdTA0MzBcdTA0NDJcdTA0MzhcdTA0MzVcdTA0M0MgXHUwNDNEXHUwNDMwIFx1MDQ0NFx1MDQzRVx1MDQ0Mlx1MDQzRSc7XHJcbiAgICAgICAgcnVGZWF0dXJlcy5jcmVhdGVFbCgnbGknKS5pbm5lclRleHQgPSAnXHUwNDE1XHUwNDQxXHUwNDNCXHUwNDM4IFx1MDQzQ1x1MDQzMFx1MDQ0MVx1MDQ0OFx1MDQ0Mlx1MDQzMFx1MDQzMSBcdTA0NDRcdTA0M0VcdTA0NDJcdTA0M0UgXHUwNDQzXHUwNDMyXHUwNDM1XHUwNDNCXHUwNDM4XHUwNDQ3XHUwNDM1XHUwNDNEIFx1MDQzQlx1MDQzMFx1MDQzOVx1MDQ0Mlx1MDQzMVx1MDQzRVx1MDQzQVx1MDQ0MSBcdTA0M0RcdTA0MzUgXHUwNDM3XHUwNDMwXHUwNDNBXHUwNDQwXHUwNDNFXHUwNDM1XHUwNDQyXHUwNDQxXHUwNDRGIFx1MDQzRFx1MDQzMFx1MDQzNlx1MDQzMFx1MDQ0Mlx1MDQzOFx1MDQzNVx1MDQzQyBcdTA0M0RcdTA0MzAgXHUwNDNBXHUwNDMwXHUwNDQwXHUwNDQyXHUwNDM4XHUwNDNEXHUwNDNBXHUwNDQzLiBcdTA0MjFcdTA0MzFcdTA0NDBcdTA0M0VcdTA0NDFcdTA0NENcdTA0NDJcdTA0MzUgXHUwNDNDXHUwNDMwXHUwNDQxXHUwNDQ4XHUwNDQyXHUwNDMwXHUwNDMxIFx1MDQzNFx1MDQzMlx1MDQzRVx1MDQzOVx1MDQzRFx1MDQ0Qlx1MDQzQyBcdTA0M0RcdTA0MzBcdTA0MzZcdTA0MzBcdTA0NDJcdTA0MzhcdTA0MzVcdTA0M0MnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEFkZCBzb21lIHN0eWxpbmcgZm9yIHRoZSBkb2N1bWVudGF0aW9uXHJcbiAgICAgICAgY29uc3Qgc3R5bGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzdHlsZScpO1xyXG4gICAgICAgIHN0eWxlLnRleHRDb250ZW50ID0gYFxyXG4gICAgICAgICAgICAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiB7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW4tdG9wOiAyMHB4O1xyXG4gICAgICAgICAgICAgICAgcGFkZGluZzogMTVweDtcclxuICAgICAgICAgICAgICAgIGJhY2tncm91bmQ6IHZhcigtLWJhY2tncm91bmQtcHJpbWFyeSk7XHJcbiAgICAgICAgICAgICAgICBib3JkZXItcmFkaXVzOiA4cHg7XHJcbiAgICAgICAgICAgICAgICBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1iYWNrZ3JvdW5kLW1vZGlmaWVyLWJvcmRlcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC5nYWxsZXJ5LWRvYy1zZWN0aW9uIGg0IHtcclxuICAgICAgICAgICAgICAgIG1hcmdpbi10b3A6IDA7XHJcbiAgICAgICAgICAgICAgICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpO1xyXG4gICAgICAgICAgICAgICAgcGFkZGluZy1ib3R0b206IDhweDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLmdhbGxlcnktZG9jLXNlY3Rpb24gdWwge1xyXG4gICAgICAgICAgICAgICAgcGFkZGluZy1sZWZ0OiAyMHB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiBsaSB7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW4tYm90dG9tOiA1cHg7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC5nYWxsZXJ5LWRvYy1zZWN0aW9uIHByZSB7XHJcbiAgICAgICAgICAgICAgICBtYXJnaW46IDEwcHggMDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLmdhbGxlcnktZG9jLXNlY3Rpb24gY29kZSB7XHJcbiAgICAgICAgICAgICAgICBmb250LWZhbWlseTogJ0ZpcmEgQ29kZScsICdDYXNjYWRpYSBDb2RlJywgbW9ub3NwYWNlO1xyXG4gICAgICAgICAgICAgICAgZm9udC1zaXplOiAxNHB4O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAuZ2FsbGVyeS1kb2Mtc2VjdGlvbiArIC5nYWxsZXJ5LWRvYy1zZWN0aW9uIHtcclxuICAgICAgICAgICAgICAgIG1hcmdpbi10b3A6IDMwcHg7XHJcbiAgICAgICAgICAgICAgICBib3JkZXItdG9wOiAycHggc29saWQgdmFyKC0tYmFja2dyb3VuZC1tb2RpZmllci1ib3JkZXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgYDtcclxuICAgICAgICBjb250YWluZXJFbC5hcHBlbmRDaGlsZChzdHlsZSk7XHJcbiAgICB9XHJcbn0iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHNCQUFxRjtBQVVyRixJQUFNLG1CQUFvQztBQUFBLEVBQ3RDLG1CQUFtQjtBQUFBLEVBQ25CLGtCQUFrQjtBQUFBLEVBQ2xCLGtCQUFrQjtBQUFBLEVBQ2xCLFNBQVM7QUFBQSxFQUNULGdCQUFnQjtBQUNwQjtBQUVBLElBQXFCLHFCQUFyQixjQUFnRCx1QkFBTztBQUFBLEVBQXZEO0FBQUE7QUFFSSxTQUFRLFlBQW9CO0FBQzVCLFNBQVEsYUFBc0I7QUFDOUIsU0FBUSxhQUFxQjtBQUM3QixTQUFRLGFBQXFCO0FBQzdCLFNBQVEsY0FBc0I7QUFDOUIsU0FBUSxjQUFzQjtBQUU5QixTQUFRLGlCQUFxQztBQUc3QztBQUFBLFNBQVEsY0FBc0I7QUFDOUIsU0FBUSxjQUFzQjtBQUM5QixTQUFRLGlCQUF5QjtBQUNqQyxTQUFRLFlBQXFCO0FBQUE7QUFBQSxFQUU3QixNQUFNLFNBQVM7QUFDWCxZQUFRLElBQUksOEJBQThCO0FBRTFDLFVBQU0sS0FBSyxhQUFhO0FBR3hCLFNBQUssV0FBVztBQUdoQixTQUFLLGlCQUFpQjtB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
