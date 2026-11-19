// Full navigation keeps the existing strict script CSP and external share script working.
/* eslint-disable @next/next/no-html-link-for-pages */
import { notFound } from 'next/navigation'
import { getLanguage } from '../../../lib/language'
import { getBlogPost } from '../../../lib/blog'
import { localizePost } from '../../../lib/blog-data.mjs'
import { blogText } from '../../../lib/blog-translations.mjs'
import { BlogBody, BlogDate, BlogImage } from '../../components/blog-content'
import { BlogActions } from '../../components/blog-actions'

export async function generateMetadata({ params }) {
  const { language } = await getLanguage()
  const { slug } = await params
  const result = await getBlogPost(slug)
  const post = localizePost(result.result, language)
  if (!post) return { title: 'Blog | Hakadosh Ministry', robots: { index: false } }
  return {
    title: `${post.title} | Hakadosh Ministry`, description: post.excerpt,
    alternates: { canonical: `https://www.hakadoshministry.com/blog/${post.slug}` },
    openGraph: { title: post.title, description: post.excerpt, type: 'article', publishedTime: post.publishedAt, ...(post.image ? { images: [post.image] } : {}) },
  }
}

export default async function PostPage({ params }) {
  const { language } = await getLanguage()
  const text = blogText[language]
  const { slug } = await params
  const result = await getBlogPost(slug)
  if (!result.ok) return <section className="blog-shell"><a className="blog-back" href="/blog">← {text.back}</a><p className="blog-empty" role="status">{text.unavailable}</p></section>
  const post = localizePost(result.result, language)
  if (!post) notFound()
  return <article className="blog-article">
    <a className="blog-back" href="/blog">← {text.back}</a>
    <header className="blog-heading">
      <div className="blog-meta"><span>{text.categories[post.category]}</span><BlogDate post={post} language={language} /></div>
      <h1 lang={post.language}>{post.title}</h1>
      {post.language !== language && <p className="blog-language-note">{text.fallback}</p>}
    </header>
    <BlogImage post={post} priority />
    <div lang={post.language}><BlogBody blocks={post.body} language={post.language} automaticScriptureQuotes={post.automaticScriptureQuotes} /></div>
    {post.video && <p className="blog-video"><a className="hero-button hero-button-secondary" href={post.video} target="_blank" rel="noopener noreferrer">{text.video} ↗</a></p>}
    <BlogActions post={post} text={text} />
  </article>
}
