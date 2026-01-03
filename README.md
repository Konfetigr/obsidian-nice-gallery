<div align="right">
  <b>Языки:</b> 🇬🇧 [English](README.md)
</div>

# [Русская версия](https://github.com/Konfetigr/obsidian-nice-gallery/blob/main/README-ru.md)

# Image Gallery & Viewer Plugin for Obsidian

A simple image gallery and viewer plugin for Obsidian that transforms how you view and organize images in your notes. Features responsive galleries, advanced image viewing with zoom and pan, and seamless mobile support.


---

# Differences from Competitors

The main distinction from similar plugins is that you can create a gallery within a specific note based on the attachments that have already been added. In other plugins I found, you are prompted to select a folder containing images from which a magnificent gallery will be generated. This is particularly useful when you have a large knowledge base without folder-based organization.

---

<img width="921" height="322" alt="Nice Gallery Readme-1767434763975" src="https://github.com/user-attachments/assets/d2556cc9-06a5-4566-bb18-7c08ac5e7930" />

---

![Nice Gallery Readme-1767434848132](https://github.com/user-attachments/assets/9044c0ff-0e25-4cb4-b3f1-8106935049c7)


---

![Nice Gallery Readme-1767435038425](https://github.com/user-attachments/assets/d46cf58e-bcd5-47c2-8a4f-556bd4a53856)


---

## ✨ Features

### 🖼️ **Gallery Blocks**

- Create simple image galleries using markdown code blocks
- Responsive grid layout with adaptive columns for desktop, tablet, and mobile
- Customizable gap sizes and maximum columns per screen size
- Click any image to open in full-screen viewer

### 📱 **Mobile Optimized**

- Touch-friendly controls
- Mobile swipe gestures for navigation
- Adaptive layouts for different screen sizes
- Optimized touch interactions

### ⚙️ **Customizable Settings**

- Adjust maximum columns for desktop, tablet, and mobile
- Customize gap sizes between images
- Custom keyword for the code block. By default "gallery".
- Responsive design that adapts to your settings

---

## 🚀 Usage

### Creating Galleries

Create image galleries using code blocks:
```
```gallery
![[image1.jpg]]
![[image2.png]]
![[folder/image3.webp]]
![[image4.jpg]]
``
```

### Viewing Single Images

- Simply click on any **standalone image** in your notes

### Gallery Navigation

- **Desktop**: Click arrows or use keyboard arrows
- **Mobile**: Swipe left/right on the image    

### Controls in Viewer

- **Zoom**: Mouse wheel, +/- keys, or pinch gestures
- **Pan**: Drag when zoomed in
- **Reset**: Double-click/tap or press '0'
- **Navigate**: Arrow keys, swipe (mobile), or click arrows
- **Close**: Click image, or press Escape

### Templater script

Select all the images you wish to add to the gallery and run the Templater script, and it will merge them.
```
<%*
const editor = this.app.workspace.activeEditor?.editor;
if (!editor) return;

const selection = editor.getSelection();

if (selection) {
    const galleryBlock = `\`\`\`gallery\n${selection}\n\`\`\``;
    editor.replaceSelection(galleryBlock);
} else {
    const content = editor.getValue();
    const imageRegex = /!\[\[.*?\]\]/g;
    const images = content.match(imageRegex);
    
    if (images && images.length > 0) {
        const galleryBlock = `\`\`\`gallery\n${images.join('\n')}\n\`\`\``;
        editor.setValue(galleryBlock);
    } else {
        new Notice('No images found in document');
    }
}
%>
```
---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](https://license/) file for details.

---


**Note**: This plugin is not officially endorsed by Obsidian. Use at your own risk. Always back up your vault before installing new plugins.

---

_Made with ❤️ for the Obsidian community_
