

# furrutilities

**Tools to download content from furry-related websites**

NodeJS utilities to bulk download images and comics from popular furry art platforms like [e621.net](https://e621.net) and [yiffer.xyz](https://yiffer.xyz).

</br>

## Features

* **e621 Downloader:** Search posts by tag, filter out unwanted tags, and download images with concurrency control and progress bars.
* **Yiffgrabber:** Download comics from yiffer.xyz as PDF or CBZ archives, with optional ZIP compression and detailed metadata support (if working idk).

</br>

## Installation

Make sure you have [Node.js](https://nodejs.org/) installed.

```bash
git clone https://github.com/yourusername/furrutilities.git
cd furrutilities
npm install
```
</br>



## Usage

### 1. e621 Downloader

Downloads posts from e621.net filtered by tags.

```bash
node e621-downloader.js -t "tag1 tag2" -b "blockedTag1,blockedTag2" -o ./downloads -l 50 -d
```



| Option         | Description                                      | Default     |
| -------------- | ------------------------------------------------ | ----------- |
| `-t, --tag`    | Tag(s) to search for (space-separated or quoted) | *required*  |
| `-b, --block`  | Tag(s) to block/filter out (comma-separated)     | `"none"`    |
| `-o, --output` | Parent output directory                          | Current dir |
| `-l, --limit`  | Maximum number of posts to download              | 100         |
| `-d, --debug`  | Enable debug mode                                | false       |



---
</br>

### 2. Yiffgrabber

Downloads comics from yiffer.xyz and outputs as PDF or CBZ archives.

```bash
node yiffgrabber.js <comic-name> [options]
```
</br>


| Argument       | Description                                |
| -------------- | ------------------------------------------ |
| `<comic-name>` | Comic name from the URL path on yiffer.xyz |

</br>

| Option         | Description                       | Default |
| -------------- | --------------------------------- | ------- |
| `-f, --format` | Output format: `pdf` or `cbz`     | `pdf`   |
| `-z, --zipped` | Zip the downloaded images as well | false   |
| `-d, --debug`  | Enable debug logging              | false   |

**Example:**

```bash
node yiffgrabber.js mycomic -f cbz -z -d
```

</br>

## Development

Feel free to contribute or modify the tools!

```bash
npm install
node e621-downloader.js --help
node yiffgrabber.js --help
```

## License

This project is licensed under the **GPL-3.0-only** License.



