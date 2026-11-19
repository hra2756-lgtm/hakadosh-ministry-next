import { ImageResponse } from 'next/og'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scriptureShare, scriptureImageModel } from '../../../../lib/scripture-share.mjs'

export const runtime = 'nodejs'
const logo = `data:image/png;base64,${readFileSync(join(process.cwd(), 'public/favicon.png')).toString('base64')}`

export function GET(request) {
  const params = new URL(request.url).searchParams
  const share = scriptureShare(params.get('q'), params.get('lang'))
  if (!share) return new Response('Invalid Scripture reference', { status: 400 })
  const portrait = params.get('format') === 'portrait'
  const model = scriptureImageModel(share, portrait)
  const footer = model.excerpt
    ? share.language === 'es' ? 'Extracto · Lee el pasaje completo en nuestro sitio' : 'Excerpt · Read the full passage on our website'
    : 'Hakadosh Ministry'
  return new ImageResponse(
    <div style={{ display: 'flex', width: '100%', height: '100%', background: '#000', padding: portrait ? 24 : 0 }}>
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#f4eedf', color: '#29251d', padding: portrait ? '38px' : '42px 58px', border: '3px solid #a48c50', borderRadius: portrait ? 64 : 0 }}>
      <div style={{ display: 'flex', fontSize: portrait ? 40 : 38, lineHeight: 1.2 }}>{model.title}</div>
      <div style={{ display: 'flex', fontSize: 21, color: '#625845', marginTop: 12, paddingBottom: 20, borderBottom: '2px solid #a48c50' }}>{share.version === 'BSB' ? 'Berean Standard Bible · BSB' : 'La Biblia en Español Sencillo · BES'}</div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22, fontSize: portrait ? 30 : 27, lineHeight: portrait ? '39px' : '33px' }}>
        {model.lines.map((line, index) => <div key={index} style={{ display: 'flex', height: portrait ? 39 : 33 }}>{line || ' '}</div>)}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 'auto', paddingTop: 18, borderTop: '2px solid #a48c50', color: '#625845', fontSize: 18 }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders embedded image bytes, not browser HTML. */}
        {portrait && <img src={logo} alt="" width={96} height={96} style={{ alignSelf: 'center', marginBottom: 14 }} />}
        <div style={{ display: 'flex' }}>{footer}</div>
        <div style={{ display: 'flex', marginTop: 6, alignSelf: portrait ? 'center' : 'flex-start' }}>www.hakadoshministry.com</div>
      </div>
    </div>
    </div>,
    { width: portrait ? 1080 : 1200, height: portrait ? 1920 : 630,
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=604800', ...(params.get('download') === '1' ? { 'Content-Disposition': `attachment; filename="scripture-${share.language}-${share.rows[0].key}.png"` } : {}) } },
  )
}
