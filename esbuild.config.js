const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

// Создаем папку для копирования библиотек
const libDir = path.join(__dirname, 'libs');
if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir);
}

// Копируем lightgallery файлы из node_modules
const lgSource = path.join(__dirname, 'node_modules', 'lightgallery');
const lgDest = path.join(libDir, 'lightgallery');

function copyLightGallery() {
    if (fs.existsSync(lgSource)) {
        // Копируем только необходимые файлы
        const filesToCopy = [
            { src: path.join(lgSource, 'lightgallery.min.js'), dest: path.join(libDir, 'lightgallery.min.js') },
            { src: path.join(lgSource, 'css', 'lightgallery.min.css'), dest: path.join(libDir, 'lightgallery.min.css') },
        ];
        
        filesToCopy.forEach(({ src, dest }) => {
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                console.log(`Copied ${src} to ${dest}`);
            } else {
                console.log(`Warning: ${src} not found`);
            }
        });
    }
}

// Запускаем копирование перед сборкой
copyLightGallery();

const prod = process.argv[2] === 'production';

esbuild.build({
    entryPoints: ['main.ts'],
    bundle: true,
    external: ['obsidian'],
    format: 'cjs',
    target: 'es2018',
    logLevel: 'info',
    sourcemap: prod ? false : 'inline',
    treeShaking: true,
    outfile: 'main.js',
    minify: prod,
}).catch(() => process.exit(1));