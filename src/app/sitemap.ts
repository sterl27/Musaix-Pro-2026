import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/investors', '/sign-in', '/sign-up', '/forgot-password', '/privacy', '/terms', '/audio', '/studio', '/canvas', '/research'];
  return paths.map(path => ({
    url: `https://sterlai.com${path === '/' ? '' : path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.6
  }));
}
