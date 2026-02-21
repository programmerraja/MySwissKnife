// https://y2down.cc/en7x/youtube-playlist
// https://ssyoutube.online/yt-video-detail/
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");
const { title } = require("process");
const folderName = "deeplearning_andrewng";

class VideoDownloader {
  constructor() {
    this.baseUrl = "https://p.oceansaver.in";
    this.downloadDir = folderName;
    this.headers = {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,ta-IN;q=0.8,ta;q=0.7",
      "cache-control": "no-cache",
      dnt: "1",
      origin: "https://y2down.cc",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://y2down.cc/",
      "sec-ch-ua":
        '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Linux"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent":
        "Mozilla/5.0 (X11; Linux x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
    };

    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
      console.log(`Created download directory: ${this.downloadDir}`);
    }
  }

  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === "https:" ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: { ...this.headers, ...options.headers },
      };

      const req = client.request(requestOptions, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (error) {
            resolve(data);
          }
        });
      });

      req.on("error", reject);
      req.setTimeout(30000, () => req.destroy());
      req.end();
    });
  }

  async initiateDownload(videoUrl, format = "720") {
    const downloadUrl = `${
      this.baseUrl
    }/ajax/download.php?copyright=0&format=${format}&url=${encodeURIComponent(
      videoUrl
    )}&api=dfcb6d76f2f6a9894gjkege8a4ab232222`;

    try {
      const response = await this.makeRequest(downloadUrl);

      if (response.success && response.id) {
        return {
          id: response.id,
          title: response.title || response.info?.title || "Unknown Title",
          success: true,
        };
      } else {
        throw new Error(
          `Failed to initiate download: ${response.message || "Unknown error"}`
        );
      }
    } catch (error) {
      throw new Error(`Error initiating download: ${error.message}`);
    }
  }

  async pollProgress(downloadId, maxAttempts = 60) {
    const progressUrl = `${this.baseUrl}/api/progress?id=${downloadId}`;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await this.makeRequest(progressUrl);

        if (response.success === 1 && response.download_url) {
          return {
            downloadUrl: response.download_url,
            progress: response.progress,
            text: response.text,
          };
        }

        if (response.success === 0) {
          console.log(`Progress: ${response.progress}% - ${response.text}`);
        }

        // Wait 4 seconds before next poll
        await new Promise((resolve) => setTimeout(resolve, 4000));
        attempts++;
      } catch (error) {
        console.error(`Error polling progress: ${error.message}`);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    throw new Error("Download timeout - max attempts reached");
  }

  async downloadVideo(downloadUrl, filename) {
    return new Promise((resolve, reject) => {
      const filePath = path.join(this.downloadDir, filename);
      const fileStream = fs.createWriteStream(filePath);

      const urlObj = new URL(downloadUrl);
      const client = urlObj.protocol === "https:" ? https : http;

      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === "https:" ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: "GET",
        headers: {
          "User-Agent": this.headers["user-agent"],
        },
      };

      const req = client.request(requestOptions, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }

        const totalSize = parseInt(res.headers["content-length"], 10);
        let downloadedSize = 0;
        let lastProgress = 0;

        res.on("data", (chunk) => {
          downloadedSize += chunk.length;
          fileStream.write(chunk);

          if (totalSize) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            if (progress > lastProgress + 9) {
              // Show progress every 10%
              console.log(`Downloading ${filename}: ${progress}%`);
              lastProgress = progress;
            }
          }
        });

        res.on("end", () => {
          fileStream.end();
          console.log(`✅ Downloaded: ${filename}`);
          resolve(filePath);
        });
      });

      req.on("error", (error) => {
        fileStream.destroy();
        fs.unlink(filePath, () => {}); // Clean up partial file
        reject(error);
      });

      fileStream.on("error", (error) => {
        req.destroy();
        reject(error);
      });

      req.setTimeout(300000, () => {
        // 5 minute timeout
        req.destroy();
        fileStream.destroy();
        fs.unlink(filePath, () => {});
        reject(new Error("Download timeout"));
      });

      req.end();
    });
  }

  sanitizeFilename(filename) {
    // Remove invalid characters and limit length
    return (
      filename
        .replace(/[<>:"/\\|?*]/g, "_")
        .replace(/\s+/g, "_")
        .substring(0, 100) + ".mp4"
    );
  }

  async downloadVideoFromUrl(videoUrl, format = "720") {
    try {
      console.log(`\n🚀 Starting download for: ${videoUrl}`);

      // Step 1: Initiate download
      const initResult = await this.initiateDownload(videoUrl, format);
      console.log(`📋 Video: ${initResult.title}`);
      console.log(`🆔 Download ID: ${initResult.id}`);

      // Step 2: Poll for progress
      console.log("⏳ Waiting for download to complete...");
      const progressResult = await this.pollProgress(initResult.id);
      console.log(`🎯 Download ready: ${progressResult.text}`);

      // Step 3: Download the video
      const filename = this.sanitizeFilename(initResult.title);
      const filePath = await this.downloadVideo(
        progressResult.downloadUrl,
        filename
      );

      return {
        success: true,
        title: initResult.title,
        filename: filename,
        filePath: filePath,
      };
    } catch (error) {
      console.error(`❌ Failed to download ${videoUrl}: ${error.message}`);
      return {
        success: false,
        url: videoUrl,
        error: error.message,
      };
    }
  }

  async downloadMultipleVideos(urls, format = "720", concurrent = 1) {
    console.log(`🎬 Starting batch download of ${urls.length} videos`);
    console.log(`📁 Saving to: ${path.resolve(this.downloadDir)}`);

    const results = [];

    if (concurrent === 1) {
      // Sequential download
      for (let i = 0; i < urls.length; i++) {
        console.log(`\n📥 Processing ${i + 1}/${urls.length}`);
        const result = await this.downloadVideoFromUrl(urls[i], format);
        results.push(result);
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    } else {
      // Concurrent download with limited concurrency
      const chunks = [];
      for (let i = 0; i < urls.length; i += concurrent) {
        chunks.push(urls.slice(i, i + concurrent));
      }

      for (let i = 0; i < chunks.length; i++) {
        console.log(`\n📥 Processing batch ${i + 1}/${chunks.length}`);
        const batchPromises = chunks[i].map((url) =>
          this.downloadVideoFromUrl(url, format)
        );
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result) => {
          if (result.status === "fulfilled") {
            results.push(result.value);
          } else {
            results.push({
              success: false,
              error: result.reason.message,
            });
          }
        });
      }
    }

    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;

    console.log("\n📊 Download Summary:");
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);

    if (failed > 0) {
      console.log("\n❌ Failed downloads:");
      results
        .filter((r) => !r.success)
        .forEach((r) => {
          console.log(`  - ${r.url || "Unknown"}: ${r.error}`);
        });
    }

    return results;
  }
}

async function main() {
  const downloader = new VideoDownloader();

  let videoUrls = [
    // {
    //   url: "https://www.youtube.com/watch?v=0z6AhrOSrRs",
    //   title:
    //     "Mathematics for Machine Learning Tutorial (3 Complete Courses in 1 video)",
    // },
    // {
    //   url: "https://www.youtube.com/watch?v=0-reLsDhAPg",
    //   title: "Calculus for Machine Learning and Data Science",
    // },
    // {
    //   url: "https://www.youtube.com/watch?v=DCZSkoVvkQI",
    //   title: "Probability & Statistics for Machine Learning and Data Science",
    // },
    // {
    //   url:"https://www.youtube.com/watch?v=Wi5hWa_XEck",
    //   title: "Linear Algebra for Machine Learning and Data Science",
    // }
  ];

  videoUrls = [
    { url: "https://www.youtube.com/watch?v=ArPaAX_PhIs" },
    { url: "https://www.youtube.com/watch?v=XuD4C8vJzEQ" },
    { url: "https://www.youtube.com/watch?v=am36dePheDc" },
    { url: "https://www.youtube.com/watch?v=smHa2442Ah4" },
    { url: "https://www.youtube.com/watch?v=tQYZaDn_kSg" },
    { url: "https://www.youtube.com/watch?v=KTB_OFoAQcc" },
    { url: "https://www.youtube.com/watch?v=jPOAS7uCODQ" },
    { url: "https://www.youtube.com/watch?v=3PyJA9AfwSk" },
    { url: "https://www.youtube.com/watch?v=8oOgPUO-TBY" },
    { url: "https://www.youtube.com/watch?v=bXJx7y51cl0" },
    { url: "https://www.youtube.com/watch?v=ay3zYUeuyhU" },
    { url: "https://www.youtube.com/watch?v=-bvTzZCEOdM" },
    { url: "https://www.youtube.com/watch?v=dZVkygnKh1M" },
    { url: "https://www.youtube.com/watch?v=ZILIbUvp5lk" },
    { url: "https://www.youtube.com/watch?v=RYth6EbBUqM" },
    { url: "https://www.youtube.com/watch?v=c1RBQzKsDCk" },
    { url: "https://www.youtube.com/watch?v=C86ZXvgpejM" },
    { url: "https://www.youtube.com/watch?v=KfV8CJh7hE0" },
    { url: "https://www.youtube.com/watch?v=cFFu__mcoIw" },
    { url: "https://www.youtube.com/watch?v=FQM13HkEfBk" },
    { url: "https://www.youtube.com/watch?v=JI8saFjK84o" },
    { url: "https://www.youtube.com/watch?v=c3zw6KI6dLc" },
    { url: "https://www.youtube.com/watch?v=GSwYGkTfOKk" },
    { url: "https://www.youtube.com/watch?v=rRB9iymNy1w" },
    { url: "https://www.youtube.com/watch?v=5e5pjeojznk" },
    { url: "https://www.youtube.com/watch?v=XdsmlBGOK-k" },
    { url: "https://www.youtube.com/watch?v=ANIzQ5G-XPE" },
    { url: "https://www.youtube.com/watch?v=VAo84c1hQX8" },
    { url: "https://www.youtube.com/watch?v=RTlwl2bv0Tg" },
    { url: "https://www.youtube.com/watch?v=9s_FpMpdYW8" },
    { url: "https://www.youtube.com/watch?v=6ykvU9WuIws" },
    { url: "https://www.youtube.com/watch?v=-FfMVnwXrZ0" },
    { url: "https://www.youtube.com/watch?v=96b_weTZb2w" },
    { url: "https://www.youtube.com/watch?v=6jfw8MuKwpI" },
    { url: "https://www.youtube.com/watch?v=d2XB5-tuCWU" },
    { url: "https://www.youtube.com/watch?v=0NSLgoEtdnw" },
    { url: "https://www.youtube.com/watch?v=R39tWYYKNcI" },
    { url: "https://www.youtube.com/watch?v=ChoV5h7tw5A" },
    { url: "https://www.youtube.com/watch?v=xY-DMAJpIP4" },
    { url: "https://www.youtube.com/watch?v=b1I5X3UfEYI" },
    { url: "https://www.youtube.com/watch?v=QgkLfjfGul8" },
    { url: "https://www.youtube.com/watch?v=Cn8AtS-9Nwc" },
  ];

  // [{
  //   url:"https://youtu.be/Ux1Di2mAsGs?si=44nsbeQcyiYlexnp",
  //     title: "ML projects andrew ng",

  // }]

  if (videoUrls.length === 0) {
    console.log("❌ Please add video URLs to the videoUrls array");
    return;
  }

  try {
    const urls = videoUrls.map((video) => video.url).reverse();
    const results = await downloader.downloadMultipleVideos(urls, "720", 1);

    console.log("\n🎉 All downloads completed!");
  } catch (error) {
    console.error("💥 Fatal error:", error.message);
  }
}

main().catch(console.error);

// const new_urls = [
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=gZmobeGL0Yg",
//         "info": {
//             "title": "Deep Learning playlist overview & Machine Learning intro",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/gZmobeGL0Yg\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/gZmobeGL0Yg?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Deep Learning playlist overview &amp; Machine Learning intro\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=OT1jslLoCyA",
//         "info": {
//             "title": "Deep Learning explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/OT1jslLoCyA\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/OT1jslLoCyA?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Deep Learning explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=hfK_dvC-avg",
//         "info": {
//             "title": "Artificial Neural Networks explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/hfK_dvC-avg\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/hfK_dvC-avg?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Artificial Neural Networks explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=FK77zZxaBoI",
//         "info": {
//             "title": "Layers in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/FK77zZxaBoI\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/FK77zZxaBoI?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Layers in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=m0pIlLfpXWE",
//         "info": {
//             "title": "Activation Functions in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/m0pIlLfpXWE\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/m0pIlLfpXWE?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Activation Functions in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=sZAlS3_dnk0",
//         "info": {
//             "title": "Training a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/sZAlS3_dnk0\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/sZAlS3_dnk0?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Training a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=_N5kpSMDf4o",
//         "info": {
//             "title": "How a Neural Network Learns explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/_N5kpSMDf4o\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/_N5kpSMDf4o?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"How a Neural Network Learns explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=Skc8nqJirJg",
//         "info": {
//             "title": "Loss in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/Skc8nqJirJg\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/Skc8nqJirJg?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Loss in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=jWT-AX9677k",
//         "info": {
//             "title": "Learning Rate in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/jWT-AX9677k\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/jWT-AX9677k?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Learning Rate in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=Zi-0rlM4RDs",
//         "info": {
//             "title": "Train, Test, & Validation Sets explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/Zi-0rlM4RDs\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/Zi-0rlM4RDs?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Train, Test, &amp; Validation Sets explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=Z0KVRdE_a7Q",
//         "info": {
//             "title": "Predicting with a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/Z0KVRdE_a7Q\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/Z0KVRdE_a7Q?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Predicting with a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=DEMmkFC6IGM",
//         "info": {
//             "title": "Overfitting in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/DEMmkFC6IGM\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/DEMmkFC6IGM?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Overfitting in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=0h8lAm5Ki5g",
//         "info": {
//             "title": "Underfitting in a Neural Network explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/0h8lAm5Ki5g\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/0h8lAm5Ki5g?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Underfitting in a Neural Network explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=Quh6x4kG6VY",
//         "info": {
//             "title": "Supervised Learning explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/Quh6x4kG6VY\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/Quh6x4kG6VY?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Supervised Learning explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=lEfrr0Yr684",
//         "info": {
//             "title": "Unsupervised Learning explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/lEfrr0Yr684\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/lEfrr0Yr684?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Unsupervised Learning explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=b-yhKUINb7o",
//         "info": {
//             "title": "Semi-supervised Learning explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/b-yhKUINb7o\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/b-yhKUINb7o?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Semi-supervised Learning explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=rfM4DaLTkMs",
//         "info": {
//             "title": "Data Augmentation explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/rfM4DaLTkMs\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/rfM4DaLTkMs?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Data Augmentation explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=v_4KWmkwmsU",
//         "info": {
//             "title": "One-hot Encoding explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/v_4KWmkwmsU\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/v_4KWmkwmsU?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"One-hot Encoding explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=YRhxdVk_sIs",
//         "info": {
//             "title": "Convolutional Neural Networks (CNNs) explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/YRhxdVk_sIs\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/YRhxdVk_sIs?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Convolutional Neural Networks (CNNs) explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=vJiZqZRkIg8",
//         "info": {
//             "title": "Convolutions in Deep Learning - Interactive Demo App",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/vJiZqZRkIg8\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/vJiZqZRkIg8?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Convolutions in Deep Learning - Interactive Demo App\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=cNBBNAxC8l4",
//         "info": {
//             "title": "Visualizing Convolutional Filters from a CNN",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/cNBBNAxC8l4\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/cNBBNAxC8l4?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Visualizing Convolutional Filters from a CNN\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=qSTv_m-KFk0",
//         "info": {
//             "title": "Zero Padding in Convolutional Neural Networks explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/qSTv_m-KFk0\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/qSTv_m-KFk0?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Zero Padding in Convolutional Neural Networks explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=ZjM_XQa5s6s",
//         "info": {
//             "title": "Max Pooling in Convolutional Neural Networks explained",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/ZjM_XQa5s6s\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/ZjM_XQa5s6s?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Max Pooling in Convolutional Neural Networks explained\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=kt6iUG0Gfm0",
//         "info": {
//             "title": "Max Pooling in Deep Learning - Interactive Demo App",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/kt6iUG0Gfm0\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/kt6iUG0Gfm0?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Max Pooling in Deep Learning - Interactive Demo App\"><\/iframe>"
//         }
//     },
//     {
//         "url": "https:\/\/www.youtube.com\/watch?v=XE3krf3CQls",
//         "info": {
//             "title": "Backpropagation explained | Part 1 - The intuition",
//             "author_name": "deeplizard",
//             "author_url": "https:\/\/www.youtube.com\/@deeplizard",
//             "type": "video",
//             "height": 113,
//             "width": 200,
//             "version": "1.0",
//             "provider_name": "YouTube",
//             "provider_url": "https:\/\/www.youtube.com\/",
//             "thumbnail_height": 360,
//             "thumbnail_width": 480,
//             "thumbnail_url": "https:\/\/i.ytimg.com\/vi\/XE3krf3CQls\/hqdefault.jpg",
//             "html": "<iframe width=\"200\" height=\"113\" src=\"https:\/\/www.youtube.com\/embed\/XE3krf3CQls?feature=oembed\" frameborder=\"0\" allow=\"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share\" referrerpolicy=\"strict-origin-when-cross-origin\" allowfullscreen title=\"Backpropagation explained | Part 1 - The intuition\"><\/iframe>"
//         }
//     }
// ]

const URLS = [
  {
    url: "https://www.youtube.com/watch?v=uZeDTwWcnuY",
    info: {
      title: "Linear Algebra - Math for Machine Learning",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/uZeDTwWcnuY/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/uZeDTwWcnuY?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Linear Algebra - Math for Machine Learning"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=99QfjbX6uxg",
    info: {
      title: "Math4ML Exercises: Getting Started & Linear Algebra",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/99QfjbX6uxg/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/99QfjbX6uxg?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Math4ML Exercises: Getting Started &amp; Linear Algebra"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=BkrjmrogP70",
    info: {
      title: "Math4ML Exercises: Linear Algebra, cont'd",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/BkrjmrogP70/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/BkrjmrogP70?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Math4ML Exercises: Linear Algebra, cont&#39;d"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=MDL384gsAk0",
    info: {
      title: "Calculus - Math for Machine Learning",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/MDL384gsAk0/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/MDL384gsAk0?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Calculus - Math for Machine Learning"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=IkeEadgSy6w",
    info: {
      title: "Math4ML Exercises: Calculus",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/IkeEadgSy6w/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/IkeEadgSy6w?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Math4ML Exercises: Calculus"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=LBemXHm_Ops",
    info: {
      title: "Probability - Math for Machine Learning",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/LBemXHm_Ops/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/LBemXHm_Ops?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Probability - Math for Machine Learning"></iframe>',
    },
  },
  {
    url: "https://www.youtube.com/watch?v=j9XpwENZ2ko",
    info: {
      title: "Math4ML Exercises: Probability",
      author_name: "Weights & Biases",
      author_url: "https://www.youtube.com/@WeightsBiases",
      type: "video",
      height: 113,
      width: 200,
      version: "1.0",
      provider_name: "YouTube",
      provider_url: "https://www.youtube.com/",
      thumbnail_height: 360,
      thumbnail_width: 480,
      thumbnail_url: "https://i.ytimg.com/vi/j9XpwENZ2ko/hqdefault.jpg",
      html: '<iframe width="200" height="113" src="https://www.youtube.com/embed/j9XpwENZ2ko?feature=oembed" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen title="Math4ML Exercises: Probability"></iframe>',
    },
  },
];
