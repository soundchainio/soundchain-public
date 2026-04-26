import type { NextApiRequest, NextApiResponse } from 'next'
import { registry, listCategories } from 'skills'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'GET only' })
  }

  const skills = registry()
  const categories = listCategories()

  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300')

  return res.status(200).json({
    success: true,
    data: {
      version: '1.0.0',
      total: skills.length,
      categories: categories.map(c => ({
        category: c,
        count: skills.filter(s => s.category === c).length,
      })),
      skills,
    },
    meta: {
      timestamp: new Date().toISOString(),
      docs: 'https://soundchain.io/skill.md',
    },
  })
}
