import { getPageMetadata, getLanguage } from '../../lib/language'
import { getBlogPage } from '../../lib/blog'
import { localizePost, pageNumber, BLOG_PAGE_SIZE } from '../../lib/blog-data.mjs'
import { blogText } from '../../lib/blog-translations.mjs'
import { BlogDate, BlogImage } from '../components/blog-content'
import { BlogActions } from '../components/blog-actions'

export async function generateMetadata() {
  return getPageMetadata('blog')
}

export default async function Page({ searchParams }) {
  const { language } = await getLanguage()
  const text = blogText[language]
  const page = pageNumber((await searchParams)?.page)
  const response = await getBlogPage(page)
  const posts = response.posts.map(post => localizePost(post, language)).filter(Boolean)
  return <section className="blog-shell">
    <header className="blog-heading">
      <span className="content-eyebrow">Hakadosh Ministry · Blog</span>
      <h1>{text.title}</h1><p>{text.intro}</p>
    </header>
    {!response.ok ? <p className="blog-empty" role="status">{text.unavailable}</p> : !posts.length ?
      <div className="blog-empty"><h2>{text.empty}</h2><p>{text.emptyBody}</p></div> :
      <div className="blog-grid">{posts.map((post, index) => <article className={`blog-card${page === 1 && index === 0 ? ' blog-featured' : ''}`} key={post.id}>
        <BlogImage post={post} priority={index === 0} />
        <div className="blog-card-content">
          {page === 1 && index === 0 && <p className="content-eyebrow">{text.latest}</p>}
          <div className="blog-meta"><span>{text.categories[post.category]}</span><BlogDate post={post} language={language} /></div>
          <h2 lang={post.language}><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
          {post.language !== language && <p className="blog-language-note">{text.fallback}</p>}
          <p className="blog-excerpt" lang={post.language}>{post.excerpt}</p>
          <a className="hero-button hero-button-secondary" href={`/blog/${post.slug}`}>{text.read} <span aria-hidden="true">→</span></a>
          <BlogActions post={post} text={text} />
        </div>
      </article>)}</div>}
    {(page > 1 || response.total > BLOG_PAGE_SIZE) && <nav className="blog-pagination" aria-label={text.page}>
      {page > 1 && <a href={`/blog?page=${page - 1}`}>{text.previous}</a>}
      <span>{text.page} {page}</span>
      {page * BLOG_PAGE_SIZE < response.total && <a href={`/blog?page=${page + 1}`}>{text.next}</a>}
    </nav>}
  </section>
}
