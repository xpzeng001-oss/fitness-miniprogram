#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT_DIR = __dirname;
const CATALOG_PATH = process.env.EXERCISES_JSON
  ? path.resolve(process.env.EXERCISES_JSON)
  : path.join(ROOT_DIR, 'server', 'exercises.json');
const SOURCE_DIR = process.env.GIF_DIR
  ? path.resolve(process.env.GIF_DIR)
  : path.join(ROOT_DIR, 'source-gifs');
const ASSETS_DIR = process.env.ASSETS_DIR
  ? path.resolve(process.env.ASSETS_DIR)
  : path.join(ROOT_DIR, 'assets');

const WIDTH = Number(process.env.VIDEO_WIDTH || 720);
const CRF = Number(process.env.VIDEO_CRF || 28);
const FPS = Number(process.env.VIDEO_FPS || 24);
const PRESET = process.env.VIDEO_PRESET || 'medium';
const OVERWRITE = process.env.OVERWRITE === '1';

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status}`);
  }
}

function assertFfmpeg() {
  const result = spawnSync('ffmpeg', ['-version'], {
    stdio: 'ignore'
  });

  if (result.error || result.status !== 0) {
    throw new Error('ffmpeg is required. Install it first, then rerun this script.');
  }
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
}

function findGif(exerciseId) {
  const candidates = [
    path.join(SOURCE_DIR, `${exerciseId}.gif`),
    path.join(SOURCE_DIR, exerciseId, 'demo.gif'),
    path.join(SOURCE_DIR, exerciseId, `${exerciseId}.gif`)
  ];

  return candidates.find(file => fs.existsSync(file));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function fileSize(file) {
  if (!fs.existsSync(file)) return '-';
  const size = fs.statSync(file).size;
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`;
  return `${(size / 1024).toFixed(1)} KB`;
}

function convertGifToMp4(input, output) {
  run('ffmpeg', [
    '-hide_banner',
    '-y',
    '-i',
    input,
    '-movflags',
    '+faststart',
    '-pix_fmt',
    'yuv420p',
    '-vf',
    `fps=${FPS},scale='min(${WIDTH},iw)':-2:flags=lanczos`,
    '-c:v',
    'libx264',
    '-preset',
    PRESET,
    '-crf',
    String(CRF),
    '-an',
    output
  ]);
}

function makeThumbnail(input, output) {
  run('ffmpeg', [
    '-hide_banner',
    '-y',
    '-ss',
    '0.2',
    '-i',
    input,
    '-frames:v',
    '1',
    '-vf',
    `scale='min(${WIDTH},iw)':-2:flags=lanczos`,
    '-compression_level',
    '6',
    '-quality',
    '75',
    output
  ]);
}

function main() {
  assertFfmpeg();

  const catalog = readCatalog();
  let converted = 0;
  let skipped = 0;
  let missing = 0;
  let failed = 0;

  console.log(`Catalog: ${CATALOG_PATH}`);
  console.log(`GIF source: ${SOURCE_DIR}`);
  console.log(`Assets output: ${ASSETS_DIR}`);
  console.log(`Video: width<=${WIDTH}, fps=${FPS}, crf=${CRF}, preset=${PRESET}`);
  console.log(`Overwrite: ${OVERWRITE ? 'yes' : 'no'}`);
  console.log('');

  for (const exercise of catalog) {
    const gif = findGif(exercise.id);
    if (!gif) {
      missing += 1;
      console.warn(`[missing] ${exercise.id}: put gif at source-gifs/${exercise.id}.gif`);
      continue;
    }

    const outDir = path.join(ASSETS_DIR, exercise.id);
    const mp4 = path.join(outDir, 'demo.mp4');
    const thumb = path.join(outDir, 'thumb.webp');

    if (!OVERWRITE && fs.existsSync(mp4) && fs.existsSync(thumb)) {
      skipped += 1;
      console.log(`[skip] ${exercise.id}: assets already exist`);
      continue;
    }

    try {
      ensureDir(outDir);
      convertGifToMp4(gif, mp4);
      makeThumbnail(gif, thumb);
      converted += 1;
      console.log(`[ok] ${exercise.id}: gif=${fileSize(gif)}, mp4=${fileSize(mp4)}, thumb=${fileSize(thumb)}`);
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${exercise.id}: ${error.message || error}`);
    }
  }

  console.log('');
  console.log(`Done. converted=${converted}, skipped=${skipped}, missing=${missing}, failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
