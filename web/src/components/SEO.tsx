import { config } from 'config'
import Head from 'next/head'
import React from 'react'

export interface SEOProps {
  title: string
  description: string
  image?: string | null
  canonicalUrl: string
  type?: 'music.song'
}

export default function SEO(props: SEOProps) {
  const { title, description, image = `${config.domainUrl}/soundchain-meta-logo.png`, canonicalUrl } = props
  const metaImage = image?.startsWith('/') ? `${config.domainUrl}${image}` : image
  return (
    <Head>
      {title && (
        <>
          <title>{title}</title>
          <meta property="og:title" content={title} />
          <meta property="og:site" content="SoundChain" />
          <meta property="twitter:title" content={title} />
        </>
      )}
      {description && (
        <>
          <meta name="description" content={description} />
          <meta property="og:description" content={description} />
          <meta name="twitter:description" content={description} />
        </>
      )}
      {metaImage && (
        <>
          <meta property="og:image" content={metaImage} />
          <meta property="twitter:image" content={metaImage} />
          <meta name="twitter:card" content="summary_large_image" />
        </>
      )}
      <link rel="canonical" href={`${config.domainUrl}${canonicalUrl}`} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={`${config.domainUrl}${canonicalUrl}`} />
    </Head>
  )
}
