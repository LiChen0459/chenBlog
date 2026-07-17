import { filePostsRepo } from './file/posts.js'
import { fileMomentsRepo } from './file/moments.js'
import { fileImagesRepo } from './file/images.js'

// Production repos are lazy-loaded only when DATABASE_URL is set.
// This avoids importing @neondatabase/serverless or @vercel/blob
// during local development.
const isProduction = !!process.env.DATABASE_URL

let _postsRepo, _momentsRepo, _imagesRepo

async function loadProdRepos() {
  if (!_postsRepo) {
    const [{ vercelPostsRepo }, { vercelMomentsRepo }, { vercelImagesRepo }] =
      await Promise.all([
        import('./vercel/posts.js'),
        import('./vercel/moments.js'),
        import('./vercel/images.js'),
      ])
    _postsRepo = vercelPostsRepo
    _momentsRepo = vercelMomentsRepo
    _imagesRepo = vercelImagesRepo
  }
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
