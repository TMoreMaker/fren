// What the live preview shows for the answers saved so far (frames 2.1 to 2.8).
import type { Project } from '@/lib/db/schema'
import type { AskPreviewProps } from './AskPreview'

export type SavedAnswers = Pick<
  Project,
  'productName' | 'website' | 'makerName' | 'photoUrl' | 'momentDescription' | 'momentHints' | 'tone' | 'headline' | 'message' | 'amounts' | 'defaultAmount'
>

export function previewFrom(p: SavedAnswers): AskPreviewProps {
  return {
    productName: p.productName,
    makerName: p.makerName,
    photoUrl: p.photoUrl,
    // Until Fren AI writes one (2.4), the canvas shows this (2.2, 2.3).
    headline: p.headline ?? (p.productName ? `Enjoying ${p.productName}?` : null),
    message: p.message,
    amounts: p.amounts,
    defaultAmount: p.defaultAmount,
    caption: p.momentDescription ? 'Shows when Fren AI spots the moment you described.' : 'Shows after the moment you describe.',
  }
}

export function savedAnswers(p: Project): SavedAnswers {
  return {
    productName: p.productName,
    website: p.website,
    makerName: p.makerName,
    photoUrl: p.photoUrl,
    momentDescription: p.momentDescription,
    momentHints: p.momentHints,
    tone: p.tone,
    headline: p.headline,
    message: p.message,
    amounts: p.amounts,
    defaultAmount: p.defaultAmount,
  }
}
