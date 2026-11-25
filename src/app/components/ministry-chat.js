import Image from 'next/image'

export function MinistryChat({ language }) {
  const es = language === 'es'
  return (
    <div className="ministry-chat" data-ministry-chat data-language={language}>
      <button type="button" className="chat-launch" aria-haspopup="dialog" aria-controls="ministry-chat-dialog"
        aria-label={es ? 'Hablemos — asistente IA de Hakadosh Ministry' : 'Let’s talk — Hakadosh Ministry AI assistant'}>
        <Image className="chat-launch-logo" src="/favicon.png" alt="" width={40} height={40} />
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8H5l-3 2v-10a9 9 0 0 1 18 0Z" /><path d="M7 10h8M7 14h5" /></svg>
        <span className="chat-launch-copy">
          <span className="chat-launch-invitation" aria-hidden="true">{es ? '¿Cómo puedo servirte hoy?' : 'How can I serve you today?'}</span>
          <span>{es ? 'Hablemos' : 'Let’s talk'}</span>
        </span>
      </button>
      <dialog id="ministry-chat-dialog" className="chat-dialog" aria-labelledby="chat-title">
        <header className="chat-heading">
          <Image src="/favicon.png" alt="" width={44} height={44} />
          <div><h2 id="chat-title">Hakadosh Ministry</h2><p>{es ? 'Tu asistente de estudio bíblico · IA' : 'Your Bible study assistant · AI'}</p></div>
          <button type="button" className="chat-close" aria-label={es ? 'Cerrar conversación' : 'Close conversation'}>×</button>
        </header>
        <div className="chat-scroll">
          <p className="chat-intro">{es ? 'Un espacio para preguntar, aprender y acercarte a la Palabra.' : 'A place to ask, learn, and draw closer to the Word.'}</p>
          <details className="chat-privacy"><summary>{es ? 'Tu privacidad y este asistente' : 'Your privacy and this assistant'}</summary>
            <p>{es ? 'Esta IA puede equivocarse. Verifica las respuestas en la Biblia. La conversación permanece en esta página y se envía a Cloudflare Workers AI para responder. No guardamos un historial permanente ni enviamos tu conversación al ministerio. Se conservan contadores técnicos de uso. Evita compartir información sensible. Al enviar aceptas este procesamiento.' : 'AI can make mistakes. Check answers against Scripture. Conversation context stays in this page and is sent to Cloudflare Workers AI to respond. We do not archive chats or forward them to the ministry. Technical usage counters are retained. Avoid sharing sensitive information. Sending a message agrees to this processing.'}</p>
          </details>
          <div className="chat-starters">
            <button type="button">{es ? 'Explícame Hebreos 11:1' : 'Explain Hebrews 11:1'}</button>
            <button type="button">{es ? '¿Cómo puedo contactar al ministerio?' : 'How can I contact the ministry?'}</button>
          </div>
          <div className="chat-messages" role="log" aria-live="polite" aria-relevant="additions" aria-label={es ? 'Conversación' : 'Conversation'} />
          <p className="chat-status" role="status" />
        </div>
        <form className="chat-form">
          <label htmlFor="chat-message">{es ? 'Tu pregunta' : 'Your question'}</label>
          <textarea id="chat-message" name="message" rows={2} maxLength={2000} required placeholder={es ? 'Pregunta sobre la Biblia o el ministerio…' : 'Ask about Scripture or the ministry…'} />
          <div className="chat-actions"><button type="button" className="chat-clear">{es ? 'Borrar conversación' : 'Clear conversation'}</button><button type="submit" className="chat-send">{es ? 'Enviar' : 'Send'}</button></div>
        </form>
        <footer className="chat-footer"><a href="mailto:hriver2756@hakadoshministry.com">{es ? 'Escribe al ministerio' : 'Email the ministry'}</a><span>{es ? 'No es un servicio de emergencia.' : 'Not an emergency service.'}</span></footer>
      </dialog>
      <script src="/ministry-chat.js" defer />
    </div>
  )
}
