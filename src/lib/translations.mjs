export const LANGUAGE_COOKIE = 'site-language'
export const normalizeLanguage = value => value === 'es' ? 'es' : 'en'

export const translations = {
  en: {
    description: 'Faith, truth, wisdom, and spiritual growth through Jesus Christ and the Gospel.',
    navigation: 'Navigation menu', mainNavigation: 'Main navigation', explore: 'Explore',
    logo: 'Hakadosh Ministry Logo', languageMenu: 'Choose language', selectedLanguage: 'English',
    languageOptions: { en: 'English', es: 'Español' },
    languageHelp: 'Enable JavaScript to change the website language.',
    nav: { 'youtube-spanish': 'Youtube Spanish', gospel: 'Gospel', music: 'Music', blog: 'Blog', message: 'Message', store: 'Store', contact: 'Contact', 'youtube-english': 'Youtube English' },
    home: { gospel: 'Read the Gospel', message: 'Explore the Message' },
    pages: {
      gospel: {
        title: 'This page is ready for your Gospel content.',
        description: 'A placeholder page for the Gospel section of Hakadosh Ministry.',
        body: 'We have created the Gospel page and connected it to the navigation. Later, we can add scripture, teaching, calls to action, and any design direction you want here.',
      },
      music: {
        title: 'This page is ready for your music ministry.',
        description: 'A placeholder page for the Music section of Hakadosh Ministry.',
        body: 'The Music page is now in place. When you are ready, we can add songs, albums, embedded audio, lyrics, streaming links, or a custom layout for releases.',
      },
      blog: {
        title: 'This page is ready for your blog posts.',
        description: 'A placeholder page for the Blog section of Hakadosh Ministry.',
        body: 'The Blog page is now connected to the navigation. Later, we can turn it into a space for ministry updates, teachings, devotionals, announcements, and article archives.',
      },
      message: {
        title: 'This page is ready for your ministry message.',
        description: 'A placeholder page for the Message section of Hakadosh Ministry.',
        body: 'The Message page has been created and linked. Later, we can shape this into a strong teaching page with your mission, beliefs, study content, and supporting visuals.',
      },
      store: {
        title: 'This page is ready for your future store.',
        description: 'A placeholder page for the Store section of Hakadosh Ministry.',
        body: 'The Store page is now available in the site navigation. When you want, we can turn it into a shop for books, apparel, music, or ministry resources.',
      },
      contact: {
        title: 'This page is ready for your contact details.',
        description: 'A placeholder page for the Contact section of Hakadosh Ministry.',
        body: 'The Contact page has been created so visitors can reach it from the navigation. Later, we can add a contact form, email information, social links, and location details.',
      },
    },
    youtube: {
      subtitle: 'The place where you can reconcile your relationship with Jesus Christ',
      videos: 'Full videos', shorts: 'Shorts', latest: 'Newest first',
      channel: 'Visit the channel', playlist: 'View playlist on YouTube', more: 'Show more',
      watch: 'Watch video', close: 'Close player', youtube: 'Watch on YouTube',
      unavailable: 'We could not load the videos right now. You can watch them directly on YouTube.',
      empty: 'There are no public videos available in this playlist yet.',
    },
    notFound: { title: 'Page not found', body: 'We could not find the page you requested.', home: 'Return home' },
  },
  es: {
    description: 'Fe, verdad, sabiduría y crecimiento espiritual a través de Jesucristo y el Evangelio.',
    navigation: 'Menú de navegación', mainNavigation: 'Navegación principal', explore: 'Explorar',
    logo: 'Logo de Hakadosh Ministry', languageMenu: 'Elegir idioma', selectedLanguage: 'Español',
    languageOptions: { en: 'English', es: 'Español' },
    languageHelp: 'Activa JavaScript para cambiar el idioma del sitio.',
    nav: { 'youtube-spanish': 'YouTube en español', gospel: 'Evangelio', music: 'Música', blog: 'Blog', message: 'Mensaje', store: 'Tienda', contact: 'Contacto', 'youtube-english': 'YouTube en inglés' },
    home: { gospel: 'Lee el Evangelio', message: 'Explora el Mensaje' },
    pages: {
      gospel: {
        title: 'Esta página está lista para el contenido del Evangelio.',
        description: 'Página de la sección del Evangelio de Hakadosh Ministry, en preparación.',
        body: 'Hemos creado la página del Evangelio y la hemos conectado al menú de navegación. Más adelante podremos añadir pasajes bíblicos, enseñanzas, invitaciones a participar y el diseño que desees.',
      },
      music: {
        title: 'Esta página está lista para tu ministerio musical.',
        description: 'Página de la sección de música de Hakadosh Ministry, en preparación.',
        body: 'La página de Música ya está disponible. Cuando estés listo, podremos añadir canciones, álbumes, reproductores de audio, letras, enlaces a plataformas musicales o un diseño personalizado para los lanzamientos.',
      },
      blog: {
        title: 'Esta página está lista para las publicaciones de tu blog.',
        description: 'Página de la sección del blog de Hakadosh Ministry, en preparación.',
        body: 'La página del Blog ya está conectada al menú de navegación. Más adelante podremos convertirla en un espacio para novedades del ministerio, enseñanzas, devocionales, anuncios y un archivo de artículos.',
      },
      message: {
        title: 'Esta página está lista para el mensaje de tu ministerio.',
        description: 'Página de la sección del mensaje de Hakadosh Ministry, en preparación.',
        body: 'La página del Mensaje ya está creada y enlazada. Más adelante podremos convertirla en una página de enseñanza con tu misión, creencias, contenido de estudio y material visual de apoyo.',
      },
      store: {
        title: 'Esta página está lista para tu futura tienda.',
        description: 'Página de la sección de la tienda de Hakadosh Ministry, en preparación.',
        body: 'La página de la Tienda ya está disponible en el menú del sitio. Cuando lo desees, podremos convertirla en una tienda de libros, ropa, música o recursos del ministerio.',
      },
      contact: {
        title: 'Esta página está lista para tus datos de contacto.',
        description: 'Página de la sección de contacto de Hakadosh Ministry, en preparación.',
        body: 'La página de Contacto ya está creada para que los visitantes puedan acceder a ella desde el menú. Más adelante podremos añadir un formulario, información de correo electrónico, enlaces a redes sociales y datos de ubicación.',
      },
    },
    youtube: {
      subtitle: 'El lugar donde puedes reconciliar tu relación con Cristo Jesús',
      videos: 'Videos completos', shorts: 'Shorts', latest: 'Más recientes primero',
      channel: 'Visitar el canal', playlist: 'Ver lista de reproducción en YouTube', more: 'Mostrar más',
      watch: 'Ver video', close: 'Cerrar reproductor', youtube: 'Ver en YouTube',
      unavailable: 'No pudimos cargar los videos en este momento. Puedes verlos directamente en YouTube.',
      empty: 'Todavía no hay videos públicos disponibles en esta lista de reproducción.',
    },
    notFound: { title: 'Página no encontrada', body: 'No pudimos encontrar la página que buscas.', home: 'Volver al inicio' },
  },
}
