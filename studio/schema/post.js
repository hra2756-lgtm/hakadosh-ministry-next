import { defineField, defineType } from 'sanity'
import { InlineQuote, InlineQuoteIcon } from '../components/inline-quote.js'
import { Highlight, HighlightIcon, GoldUnderline } from '../components/text-emphasis.js'
import { DefaultOnBoolean } from '../components/default-on-boolean.js'

const localized = (name, title, type, extra = {}) => defineField({
  name, title, type: 'object',
  fields: ['en', 'es'].map(language => defineField({
    name: language, title: language === 'en' ? 'English' : 'Español', type, ...extra,
  })),
})

export const post = defineType({
  name: 'post', title: 'Revelations / Revelaciones', type: 'document',
  description: 'Only you publish here. Translations are written and reviewed by you.',
  fields: [
    localized('title', 'Title / Título', 'string', { validation: rule => rule.max(180) }),
    defineField({
      name: 'slug', title: 'Page address / Dirección de la página', type: 'slug',
      description: 'Generate once, then keep this address unchanged so shared links keep working.',
      options: { source: doc => doc.title?.en || doc.title?.es, maxLength: 96 },
      validation: rule => rule.required().custom(value => !value?.current || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.current) || 'Use lowercase letters, numbers and single hyphens.'),
    }),
    defineField({
      name: 'publishedAt', title: 'Post date / Fecha', type: 'datetime',
      description: 'Display date. Click Publish to make a post visible; this field does not schedule publishing.',
      initialValue: () => new Date().toISOString(), validation: rule => rule.required(),
    }),
    defineField({ name: 'category', title: 'Category / Categoría', type: 'string',
      options: { list: [
        { title: 'Daily Revelation / Revelación diaria', value: 'reflection' },
        { title: 'Faith / Fe', value: 'faith' },
        { title: 'Prayer / Oración', value: 'prayer' },
        { title: 'Testimony / Testimonio', value: 'testimony' },
      ] }, initialValue: 'reflection', validation: rule => rule.required(),
    }),
    localized('excerpt', 'Short introduction / Introducción breve', 'text', { rows: 3, validation: rule => rule.max(300) }),
    defineField({
      name: 'automaticScriptureQuotes', type: 'boolean',
      title: 'Automatic Scripture quotations / Citas bíblicas automáticas',
      description: 'On by default, including existing posts. A reference-only paragraph such as Psalm 23:1–2 adds the verses below it on the website (BSB / BES). Chapter-only references remain links. Turn off if you already wrote the quotations. / Activado por defecto, también en publicaciones anteriores. Escribe solo la referencia en un párrafo para mostrar los versículos debajo. Desactívalo si ya escribiste las citas. Los enlaces se conservan.',
      initialValue: true,
      components: { input: DefaultOnBoolean },
    }),
    localized('body', 'Revelation / Revelación', 'array', {
      description: 'Select words and use Inline Quote for a short quotation. Quote / Scripture styles a whole paragraph. / Selecciona palabras y usa Cita en línea para una cita breve. Quote / Scripture aplica a todo el párrafo.',
      of: [{ type: 'block', styles: [
        { title: 'Paragraph', value: 'normal' }, { title: 'Heading', value: 'h2' },
        { title: 'Subheading', value: 'h3' }, { title: 'Quote / Scripture', value: 'blockquote' },
      ], marks: {
        decorators: [
          { title: 'Bold', value: 'strong' }, { title: 'Italic', value: 'em' },
          { title: 'Gold highlight / Resaltado dorado', value: 'highlight', icon: HighlightIcon, component: Highlight },
          { title: 'Golden underline / Subrayado dorado', value: 'underline', component: GoldUnderline },
          { title: 'Inline Quote / Cita en línea', value: 'inlineQuote', icon: InlineQuoteIcon, component: InlineQuote },
        ],
        annotations: [{ name: 'link', type: 'object', title: 'Link', fields: [
          { name: 'href', type: 'url', title: 'URL', validation: rule => rule.required().uri({ scheme: ['https'] }) },
        ] }],
      } }],
    }),
    defineField({ name: 'image', title: 'Cover image / Imagen de portada', type: 'image',
      description: 'Optional. Uploaded files are accessible to anyone who has their URL, including draft images.',
      options: { hotspot: true },
      fields: [localized('alt', 'Image description / Descripción de la imagen', 'string')],
      validation: rule => rule.custom(value => !value?.asset || value.alt?.en?.trim() || value.alt?.es?.trim() ? true : 'Add an image description in English or Spanish.'),
    }),
    defineField({ name: 'videoUrl', title: 'YouTube video (optional)', type: 'url',
      description: 'Readers can open this video on YouTube.',
      validation: rule => rule.uri({ scheme: ['https'] }).custom(value => {
        if (!value) return true
        try { return ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(new URL(value).hostname) || 'Use a YouTube link.' }
        catch { return 'Use a valid YouTube URL.' }
      }),
    }),
  ],
  validation: rule => rule.custom(doc => {
    const complete = language => doc?.title?.[language]?.trim() && doc?.body?.[language]?.some(block => block.children?.some(child => child.text?.trim()))
    return complete('en') || complete('es') || 'Write a title and revelation in at least one language before publishing.'
  }),
  orderings: [{ title: 'Newest first', name: 'newest', by: [{ field: 'publishedAt', direction: 'desc' }] }],
  preview: {
    select: { en: 'title.en', es: 'title.es', date: 'publishedAt', media: 'image' },
    prepare: ({ en, es, date, media }) => ({ title: en || es || 'Untitled revelation', subtitle: date?.slice(0, 10), media }),
  },
})
