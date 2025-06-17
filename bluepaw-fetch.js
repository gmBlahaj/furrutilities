const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { program } = require("commander");
const pLimit = require("p-limit").default;
const ProgressBar = require("progress");

program
  .requiredOption("-t, --tag <tag>", "Tag(s) to search for, space-separated or quoted")
  .option("-b, --block <tag>", "Tag(s) to block (comma-separated)", "none")
  .option("-o, --output <directory>", "Parent output directory (default: current directory)", ".")
  .option("-l, --limit <number>", "Maximum number of posts to download", "100")
  .option("-d, --debug", "Enable debug mode", false)
  ;

program.parse(process.argv);

const options = program.opts();

const tags = options.tag;
const blockTags = options.block ? options.block.split(",").map(t => t.trim()) : [];
const outputParentDir = path.resolve(options.output);
const limitPosts = parseInt(options.limit, 10);
const debugMode = options.debug;
const postsPerPage = 75;


function namefolder(tagString) {
  
  return tagString
    .replace(/\s+/g, '_')
    .replace(/[<>:"/\\|?*]/g, '')
    .substring(0, 50); 
}

const folderName = namefolder(tags);
const outputDir = path.join(outputParentDir, folderName);

async function fetchPosts(tag, page = 1) {
  const url = `https://e621.net/posts.json?tags=${encodeURIComponent(tag)}&limit=${postsPerPage}&page=${page}`;
  if (debugMode) console.log(`Fetching page ${page}: ${url}`);
  const response = await axios.get(url, {
    headers: { "User-Agent": "bluepaw/1.0 (gmblahaj)" }
  });
  return response.data.posts;
}

async function downloadPosts(url, outputPath) {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios.get(url, { responseType: "stream" });
  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

(async () => {
  try {
    let allPosts = [];
    let page = 1;

    console.log("Fetching posts from e621...");
    const fetchBar = new ProgressBar("Fetching posts [:bar] :current/:total :etas", {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: Math.ceil(limitPosts / postsPerPage)
    });

    while (allPosts.length < limitPosts) {
      const posts = await fetchPosts(tags, page);
      if (posts.length === 0) break;

      const filtered = posts.filter(post => {
        const postTags = post.tags.general || [];

        
        if (blockTags.some(tag => postTags.includes(tag))) {
          if (debugMode) console.log(`Filtered out post ${post.id} due to block tags`);
          return false;
        }

        return true;
      });

      allPosts.push(...filtered);
      fetchBar.tick();
      if (allPosts.length >= limitPosts) break;
      page++;
    }

    allPosts = allPosts.slice(0, limitPosts);
    console.log(`\nFound ${allPosts.length} posts.`);

    if (!fs.existsSync(outputDir)) {
      if (debugMode) console.log(`Creating output directory: ${outputDir}`);
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const downloadBar = new ProgressBar("Downloading [:bar] :current/:total :percent :etas", {
      complete: '=',
      incomplete: ' ',
      width: 30,
      total: allPosts.length
    });

    const limit = pLimit(10);

    const tasks = allPosts.map(post =>
      limit(async () => {
        const fileUrl = post.file?.url;
        if (!fileUrl) {
          if (debugMode) console.log(`No file URL for post ${post.id}`);
          downloadBar.tick();
          return;
        }

        const ext = path.extname(fileUrl).split("?")[0];
        const filename = `${post.id}${ext}`;
        const filepath = path.join(outputDir, filename);

        try {
          if (debugMode) console.log(`Downloading ${fileUrl} to ${filepath}`);
          await downloadPosts(fileUrl, filepath);
          downloadBar.tick();
        } catch (err) {
          console.error(`\nFailed to download post ${post.id}: ${err.message}`);
          downloadBar.tick();
        }
      })
    );

    await Promise.all(tasks);
    console.log(`\nDownload complete. Files saved to: ${outputDir}`);
  } catch (error) {
    console.error("\nAn error occurred:", error.message);
    if (debugMode) console.error(error.stack);
  }
})();