export function NavigationIcon({ path }) {
  const name = path.startsWith('youtube-') ? 'youtube' : path || 'home'
  const icons = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v12h5v-7h4v7h5V9" /></>,
    youtube: <><rect x="2" y="5" width="20" height="14" rx="4" /><path d="m10 9 5 3-5 3Z" fill="currentColor" stroke="none" /></>,
    blog: <><path d="M13 3H4v18h16v-8M7 8h3M7 12h2M7 17h7" /><path d="m12 12 1-4 6-6 3 3-6 6-4 1Zm5-8 3 3" /></>,
    music: <><path d="M9 18V5l11-2v13M9 9l11-2" /><ellipse cx="6" cy="18" rx="3" ry="3" /><ellipse cx="17" cy="16" rx="3" ry="3" /></>,
    gospel: <><path d="M3 20 6 14C3 12 2 8 3 4l7 6C11 6 14 3 18 2l-3 9 2-2a3 3 0 0 1 5 2l1 1-3 1c-2 6-7 8-12 5l-5 2Z" /><path d="m7 11 5 4 3-4" /><circle cx="19.5" cy="10.5" r=".65" fill="currentColor" stroke="none" /></>,
    store: <><path d="M5 7h14l2 14H3L5 7Z" /><path d="M8 9V6a4 4 0 0 1 8 0v3" /></>,
    contact: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m3 6 9 7 9-7" /></>,
  }
  return <svg className="site-navigation-icon" viewBox="0 0 24 24" width="22" height="22"
    fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
    aria-hidden="true" focusable="false">{icons[name]}</svg>
}
