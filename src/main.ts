import ytdl from "@distube/ytdl-core";
import ffmpeg from "fluent-ffmpeg";
import * as fs from "fs";

const targetDir = './output'

function getTitle(videoInfo: ytdl.videoInfo) {
  return videoInfo.videoDetails.title.replace(/[^a-zA-Z0-9 ]/g, "").replace(/  +/g, " ").trim();
}

async function createVideo(videoInfo: ytdl.videoInfo) {
  return new Promise<void>((resolve, reject) => {
    const videoStream = ytdl.downloadFromInfo(videoInfo, { quality: "highestvideo" });
    videoStream.pipe(fs.createWriteStream(`${targetDir}/${getTitle(videoInfo)}-video.mp4`))
    videoStream.on('progress', (chunkLength, downloaded, total) => {
      // console.log(total);
    });
    videoStream.on('end', () => {
      console.log("Video downloaded successfully.");
      resolve();
    });
    videoStream.on('error', (err: Error) => {
      console.error("Error when downloading the video:", err);
      reject(err);
    });
  });
}

async function createAudio(videoInfo: ytdl.videoInfo) {
  return new Promise<void>((resolve, reject) => {
    const audioStream = ytdl.downloadFromInfo(videoInfo, { quality: "highestaudio" });
    audioStream.pipe(fs.createWriteStream(`${targetDir}/${getTitle(videoInfo)}-audio.mp3`))
    audioStream.on('progress', (chunkLength, downloaded, total) => {
      // console.log(total);
    });
    audioStream.on('end', () => {
      console.log("Audio downloaded successfully");
      resolve();
    });
    audioStream.on('error', (err: Error) => {
      console.error("Error when downloading the audio:", err);
      reject(err);
    });
  });
}

async function download(url: string) {
  if (!ytdl.validateURL(url)) {
    throw new Error("Invalid YouTube URL");
  }

  if (!fs.existsSync(targetDir)){
    fs.mkdirSync(targetDir);
  }

  const videoInfo = await ytdl.getInfo(url);
  await createVideo(videoInfo);
  await createAudio(videoInfo);

  return new Promise<void>((resolve, reject) => (
    ffmpeg()
      .input(`${targetDir}/${getTitle(videoInfo)}-video.mp4`)
      .input(`${targetDir}/${getTitle(videoInfo)}-audio.mp3`)
      .outputOptions('-c:v copy') // Copy video codec without re-encoding
      .outputOptions('-c:a aac')  // Use AAC codec for audio
      .outputOptions('-strict experimental') // Enable experimental features if needed
      .save(`${targetDir}/${getTitle(videoInfo)}.mp4`)
      .on('end', () => {
        fs.unlinkSync(`${targetDir}/${getTitle(videoInfo)}-video.mp4`);
        fs.unlinkSync(`${targetDir}/${getTitle(videoInfo)}-audio.mp3`);
        console.log("Video processing completed.");
        resolve();
      })
      .on('error', (err: Error) => {
        console.error("Error during video processing:", err);
        reject(err);
      })
  ));
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.log("Please specify the target video url");
    return;
  }

  const url = args[0];
  try {
    await download(url);
  } catch (error) {
    console.log(error);
    return;
  }
  console.log("Download complete");
})();
