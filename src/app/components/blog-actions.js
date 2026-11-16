export function BlogActions({ post, text }) {
  const url = `https://www.hakadoshministry.com/blog/${post.slug}`
  return <footer className="blog-share">
    <h2>{text.share}</h2>
    <div className="blog-share-actions">
      <div className="blog-likes" hidden data-blog-likes data-endpoint={`/api/blog/${post.slug}/likes`}
        data-like={text.like} data-liked={text.liked} data-unlike={text.unlike} data-label={text.likePost}
        data-plural={text.likes} data-singular={text.oneLike} data-error={text.likesError}
        data-limited={text.likesLimited} data-retry={text.likesRetry} data-saved={text.likesSaved} data-removed={text.likesRemoved}>
        <button className="blog-like-button" type="button" disabled aria-pressed="false" aria-label={text.likePost}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" /></svg>
          <span data-like-label>{text.like}</span>
          <span className="blog-like-count" data-like-count>—</span>
        </button>
        <p className="blog-like-status blog-status-hidden" data-like-status role="status" aria-live="polite" />
      </div>
      <a href={`https://wa.me/?text=${encodeURIComponent(`${post.title} ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
      <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">X ↗</a>
      <button type="button" hidden data-copy-blog={url} data-copied={text.copied} data-failed={text.copyFailed}>{text.copy}</button>
    </div>
    <p className="blog-copy-status" role="status" aria-live="polite" />
  </footer>
}
