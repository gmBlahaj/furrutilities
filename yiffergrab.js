#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { program } = require('commander');
const PDFDocument = require('pdfkit');
const archiver = require('archiver');
const cliProgress = require('cli-progress');


program
  .name('yiffgrabber')
  .description('Download comics from yiffer.xyz')
  .argument('<name>', 'comic name (from the URL)')
  .option('-f, --format <type>', 'output format: pdf or cbz', 'pdf')
  .option('-z, --zipped', 'zip the downloaded images')
  .option('-d, --debug', 'enable debug logging')
  .parse(process.argv);

const options = program.opts();
const comicName = program.args[0];
const logDebug = (...args) => options.debug && console.debug('[DEBUG]', ...args);

if (!comicName) program.help();


function safeDate(input) {
  const d = new Date(input);
  if (isNaN(d.getTime())) {
    logDebug(`Invalid date: "${input}", using current time.`);
    return new Date();
  }
  return d;
}

async function downloadComic() {
  try {
    const comicUrl = `https://yiffer.xyz/c/${comicName}`;
    logDebug(`Fetching comic page: ${comicUrl}`);

    const { data: html } = await axios.get(comicUrl);
    const $ = cheerio.load(html);

    const title = $('h1').text().trim();
    const author = $('a[href^="/artist/"]').text().trim();
    const datePublished = $('svg + p').filter((i, el) => $(el).text().includes('Published')).text().replace('Published', '').trim();
    const tags = $('[role="button"] span').map((i, el) => $(el).text().trim()).get();

    const imageUrls = $('img.comicPage').map((i, el) => $(el).attr('src')).get();
    if (!imageUrls.length) throw new Error('No comic pages found — possibly wrong name or structure changed.');

    const comicDir = path.join('.', comicName);
    if (!fs.existsSync(comicDir)) fs.mkdirSync(comicDir);
    logDebug(`Output directory: ${comicDir}`);

    console.log(`Downloading "${title}" by ${author} (${imageUrls.length} pages)...`);
    const bar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar.start(imageUrls.length, 0);

    const imagePaths = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      const ext = path.extname(imageUrl) || '.jpg';
      const filename = `page_${String(i + 1).padStart(4, '0')}${ext}`;
      const filePath = path.join(comicDir, filename);

      try {
        const res = await axios({ url: imageUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(filePath);
        res.data.pipe(writer);
        await new Promise((res, rej) => {
          writer.on('finish', res);
          writer.on('error', rej);
        });
        imagePaths.push(filePath);
      } catch (err) {
        logDebug(`Failed to download ${imageUrl}: ${err.message}`);
      }

      bar.update(i + 1);
    }
    bar.stop();

    const baseOutput = `${comicName}_${title.replace(/[^a-z0-9]/gi, '_')}`;

    if (options.format === 'pdf') {
  await createPDF(imagePaths, `${baseOutput}.pdf`, title, author, datePublished);
} else if (options.format === 'cbz') {
  await createCBZ(comicDir, `${baseOutput}.cbz`);
} else {
  throw new Error('Unsupported format. Use "pdf" or "cbz".');
}


    if (options.zipped) {
      await createZip(comicDir, `${baseOutput}.zip`);
    }

    console.log('Done!');
  } catch (err) {
    console.error('Error:', err.message);
    logDebug(err.stack);
  }
}

async function createPDF(images, outPath, title, author, date) {
  console.log('Creating PDF...');
  const doc = new PDFDocument({ autoFirstPage: false, info: {
    Title: title,
    Author: author,
    CreationDate: safeDate(date),
    Creator: 'yiffgrabber'
  }});
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  for (const img of images) {
    doc.addPage({ size: 'A4' });
    doc.image(img, 0, 0, { width: doc.page.width, height: doc.page.height });
  }

  doc.end();
  await new Promise(res => stream.on('finish', res));
  console.log(`PDF saved as ${outPath}`);
}

async function createCBZ(imageDir, outputPath) {
  console.log('Creating CBZ...');

  const output = fs.createWriteStream(outputPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  archive.pipe(output);
  archive.directory(imageDir, false);
  await archive.finalize();

  await new Promise(resolve => output.on('close', resolve));
  console.log(`CBZ saved as ${outputPath}`);
}



async function createZip(dir, outPath) {
  console.log('Creating ZIP...');
  const output = fs.createWriteStream(outPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(dir, false);
  await archive.finalize();
  await new Promise(res => output.on('close', res));
  console.log(`ZIP saved as ${outPath}`);
}

downloadComic();
