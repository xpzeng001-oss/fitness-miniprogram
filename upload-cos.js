#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function loadCosSdk() {
  try {
    return require('cos-nodejs-sdk-v5');
  } catch (error) {
    return require('./server/node_modules/cos-nodejs-sdk-v5');
  }
}

const COS = loadCosSdk();

const ROOT_DIR = __dirname;
const CATALOG_PATH = process.env.EXERCISES_JSON
  ? path.resolve(process.env.EXERCISES_JSON)
  : path.join(ROOT_DIR, 'server', 'exercises.json');
const ASSETS_DIR = process.env.ASSETS_DIR
  ? path.resolve(process.env.ASSETS_DIR)
  : path.join(ROOT_DIR, 'assets');

const SECRET_ID = process.env.COS_SECRET_ID;
const SECRET_KEY = process.env.COS_SECRET_KEY;
const BUCKET = process.env.COS_BUCKET || 'fitness-exercises-1318589271';
const REGION = process.env.COS_REGION || 'ap-guangzhou';
const DRY_RUN = process.env.DRY_RUN === '1';

const CONTENT_TYPES = {
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime'
};

function assertConfig() {
  if (!DRY_RUN && (!SECRET_ID || !SECRET_KEY)) {
    console.error('Missing COS_SECRET_ID or COS_SECRET_KEY.');
    console.error('Set them as temporary environment variables before running this script.');
    process.exit(1);
  }

  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Cannot find exercises catalog: ${CATALOG_PATH}`);
    process.exit(1);
  }
}

function readCatalog() {
  const raw = fs.readFileSync(CATALOG_PATH, 'utf8');
  const catalog = JSON.parse(raw);

  if (!Array.isArray(catalog)) {
    throw new Error('exercises.json must be an array');
  }

  return catalog;
}

function localPathForKey(key) {
  const parts = key.split('/').filter(Boolean);
  if (parts[0] === 'exercises') {
    parts.shift();
  }
  return path.join(ASSETS_DIR, ...parts);
}

function collectUploadItems(catalog) {
  const items = [];

  for (const exercise of catalog) {
    for (const field of ['thumbKey', 'videoKey']) {
      if (!exercise[field]) continue;

      const key = exercise[field];
      const filePath = localPathForKey(key);
      const ext = path.extname(filePath).toLowerCase();

      items.push({
        id: exercise.id,
        name: exercise.name,
        field,
        key,
        filePath,
        contentType: CONTENT_TYPES[ext] || 'application/octet-stream'
      });
    }
  }

  return items;
}

function uploadObject(cos, item) {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: item.key,
        Body: fs.createReadStream(item.filePath),
        ContentType: item.contentType
      },
      (error, data) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(data);
      }
    );
  });
}

async function main() {
  assertConfig();

  const catalog = readCatalog();
  const items = collectUploadItems(catalog);
  const cos = DRY_RUN
    ? null
    : new COS({
      SecretId: SECRET_ID,
      SecretKey: SECRET_KEY
    });

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Bucket: ${BUCKET}`);
  console.log(`Region: ${REGION}`);
  console.log(`Catalog: ${CATALOG_PATH}`);
  console.log(`Assets: ${ASSETS_DIR}`);
  console.log(`Mode: ${DRY_RUN ? 'dry run' : 'upload'}`);
  console.log('');

  for (const item of items) {
    if (!fs.existsSync(item.filePath)) {
      skipped += 1;
      console.warn(`[skip] ${item.id} ${item.field}: missing ${item.filePath}`);
      continue;
    }

    if (DRY_RUN) {
      uploaded += 1;
      console.log(`[dry] ${item.filePath} -> ${item.key} (${item.contentType})`);
      continue;
    }

    try {
      await uploadObject(cos, item);
      uploaded += 1;
      console.log(`[ok] ${item.filePath} -> ${item.key} (${item.contentType})`);
    } catch (error) {
      failed += 1;
      console.error(`[fail] ${item.filePath} -> ${item.key}`);
      console.error(error.message || error);
    }
  }

  console.log('');
  console.log(`Done. uploaded=${uploaded}, skipped=${skipped}, failed=${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
