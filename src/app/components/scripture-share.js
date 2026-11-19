import { scriptureShareLinks, scriptureImageModel } from '../../lib/scripture-share.mjs'

export function ScriptureShare({ share, text }) {
  const links = scriptureShareLinks(share)
  const image = `${share.image}&format=portrait&download=1`
  return <div className="scripture-share" data-scripture-share data-title={`${share.title} (${share.version})`}
    data-image={`${share.image}&format=portrait`} data-preparing={text.imagePreparing} data-failed={text.imageFailed}
    data-instagram-help={text.instagramHelp} data-share-help={text.shareImageHelp}>
    <div className="scripture-share-buttons" role="group" aria-label={text.share}>
      <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
      <a href={links.x} target="_blank" rel="noopener noreferrer" aria-label={text.shareX}>X ↗</a>
      <a href={image} download data-instagram-share aria-label={text.shareInstagram}>Instagram ↗</a>
      <a className="scripture-camera" href={image} download aria-label={text.downloadImage} title={text.downloadImage}>
        <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 5 9.5 3h5L16 5h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="12" r="4"/></svg>
      </a>
    </div>
    {scriptureImageModel(share, true).excerpt && <p className="scripture-share-help">{text.imageExcerpt}</p>}
    <p className="scripture-share-status" data-share-status role="status" aria-live="polite" />
    <noscript><p className="scripture-share-help">{text.instagramHelp}</p></noscript>
  </div>
}
