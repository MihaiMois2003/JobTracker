import * as cheerio from 'cheerio'

const BLOCK = 'p,div,li,ul,ol,h1,h2,h3,h4,h5,h6,tr,section,article,header,footer,blockquote,pre,dd,dt,table'
const NOISE =
  'script,style,noscript,template,svg,canvas,iframe,nav,footer,form,button,select,dialog,[role=navigation],[role=banner],[role=contentinfo],[aria-hidden=true],[hidden]'

function tidy(text: string): string {
  return text
    .replace(/ /g, ' ')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Turns an HTML fragment into readable plain text, keeping paragraph and list breaks. */
export function htmlToText(html: string): string {
  const $ = cheerio.load(html)
  $(NOISE).remove()
  $('br').replaceWith('\n')
  $('li').each((_, el) => {
    $(el).prepend('• ')
  })
  $(BLOCK).each((_, el) => {
    $(el).append('\n')
  })
  return tidy($.root().text())
}

/**
 * JSON-LD descriptions arrive as HTML, sometimes entity-escaped twice ("&lt;p&gt;").
 * Decode until no tags are left.
 */
export function cleanDescription(value: string): string {
  let text = value
  for (let i = 0; i < 3 && /<\/?[a-z][^>]*>|&lt;|&#\d+;|&[a-z]+;/i.test(text); i++) {
    text = htmlToText(text.includes('<') ? text : cheerio.load(`<div>${text}</div>`).text())
  }
  return tidy(text)
}

export interface PageText {
  title: string
  text: string
  /** Heuristic: page is a login wall or bot challenge rather than a listing. */
  looksBlocked: boolean
}

/** Extracts the main readable text of a page for the model. */
export function pageText(html: string): PageText {
  const $ = cheerio.load(html)
  const title = tidy($('title').first().text() || $('meta[property="og:title"]').attr('content') || '')
  const hasPassword = $('input[type=password]').length > 0
  const bodyText = $('body').text()
  const challenge = /just a moment|checking your browser|cf-chl|captcha|are you a robot|verify you are human/i.test(
    title + ' ' + bodyText.slice(0, 2000),
  )

  $(NOISE).remove()
  // Prefer the main content region when it carries most of the text.
  const candidates = ['main', 'article', '[role=main]', '#content', '.content']
  let rootHtml = $('body').html() ?? ''
  for (const sel of candidates) {
    const el = $(sel).first()
    if (el.length && el.text().trim().length > 600) {
      rootHtml = el.html() ?? ''
      break
    }
  }
  const text = htmlToText(rootHtml)
  const loginTitle = /\b(sign ?in|log ?in|login|autentific|conectare)\b/i.test(title)
  return { title, text, looksBlocked: challenge || ((hasPassword || loginTitle) && text.length < 2500) }
}
