import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { post } from './schema/post.js'

// Keep testing first; each workspace has its own dataset and clear destination.
const workspace = (dataset, title) => ({
  name: dataset,
  title,
  basePath: `/${dataset}`,
  projectId: '2a3jhsqe',
  dataset,
  plugins: [structureTool()],
  schema: { types: [post] },
})

export default defineConfig([
  workspace('development', 'Hakadosh Ministry — Development (Testing)'),
  workspace('production', 'Hakadosh Ministry — Production (Live posts)'),
])
