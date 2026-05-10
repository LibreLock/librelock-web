import { SitemapStream, streamToPromise } from 'sitemap'
import { writeFile } from 'node:fs/promises'

const hostname = 'http://localhost:1401'
const publicRoutes = ['/login', '/register']
const sitemap = new SitemapStream({
  hostname,
})

for (const url of publicRoutes) {
  sitemap.write({ url, changefreq: 'monthly', priority: 0.8 })
}

sitemap.end()
const xml = await streamToPromise(sitemap).then((data) => data.toString())
await writeFile('./public/sitemap.xml', xml)
console.log('sitemap.xml generated')
