import { filePostsRepo } from './file/posts.js'
import { fileMomentsRepo } from './file/moments.js'
import { fileImagesRepo } from './file/images.js'
import { fileSettingsRepo } from './file/settings.js'

// Postgres / Vercel Blob repos are used when DATABASE_URL is present.
// Local development can opt out of the remote database with `--local`
// (or USE_LOCAL_DATA=1) to read/write server/data/*.json instead.
const useLocalData =
  process.env.USE_LOCAL_DATA === '1' || process.argv.includes('--local')

const isProduction = !useLocalData && !!process.env.DATABASE_URL

let _postsRepo, _momentsRepo, _imagesRepo, _settingsRepo

async function loadProdRepos() {
  if (!_postsRepo) {
    const [{ vercelPostsRepo }, { vercelMomentsRepo }, { vercelImagesRepo }, { vercelSettingsRepo }] =
      await Promise.all([
        import('./vercel/posts.js'),
        import('./vercel/moments.js'),
        import('./vercel/images.js'),
        import('./vercel/settings.js'),
      ])
    _postsRepo = vercelPostsRepo
    _momentsRepo = vercelMomentsRepo
    _imagesRepo = vercelImagesRepo
    _settingsRepo = vercelSettingsRepo
  }
}

/** 'postgres' when talking to Neon + Vercel Blob, 'json' when using local files. */
export function storageMode() {
  return isProduction ? 'postgres' : 'json'
}

export async function getPostsRepo() {
  if (isProduction) {
    await loadProdRepos()
    return _postsRepo
  }
  return filePostsRepo
}

export async function getMomentsRepo() {
  if (isProduction) {
    await loadProdRepos()
    return _momentsRepo
  }
  return fileMomentsRepo
}

export async function getImagesRepo() {
  if (isProduction) {
    await loadProdRepos()
    return _imagesRepo
  }
  return fileImagesRepo
}

export async function getSettingsRepo() {
  if (isProduction) {
    await loadProdRepos()
    return _settingsRepo
  }
  return fileSettingsRepo
}
