// The live preview (frames 2.1 to 2.8): a blank-blocks browser with the ask in the corner,
// built from whatever the developer has answered so far. Missing parts are grey skeletons.
import s from './ask-preview.module.css'

export type PreviewPart = 'site' | 'me' | 'head' | 'msg' | 'amt'

export interface AskPreviewProps {
  makerName?: string | null
  photoUrl?: string | null
  productName?: string | null
  headline?: string | null
  message?: string | null
  amounts?: number[] | null
  defaultAmount?: number | null
  /** Gets the dashed outline: the part the current step just changed. */
  changed?: PreviewPart | null
  caption?: string
}

function Mock({ w, h, bg, style }: { w?: string | number; h: number; bg: string; style?: React.CSSProperties }) {
  return <span className={s.block} style={{ width: w, height: h, background: `var(${bg})`, ...style }} />
}

function Skeleton({ w, h, round }: { w?: string | number; h: number; round?: boolean }) {
  return <span className={s.sk} style={{ width: w, height: h, borderRadius: round ? 999 : undefined, flex: w ? undefined : 1 }} />
}

export function AskToast({ makerName, photoUrl, productName, headline, message, amounts, defaultAmount, changed }: AskPreviewProps) {
  const hl = (part: PreviewPart) => (changed === part ? s.hl : '')
  const selected = amounts?.length ? (defaultAmount && amounts.includes(defaultAmount) ? defaultAmount : amounts[Math.floor(amounts.length / 2)]) : null

  return (
    <div className={s.ask} aria-label="Preview of your ask">
      <div className={s.top}>
        {makerName ? (
          photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={`${s.av} ${hl('me')}`} src={photoUrl} alt="" />
          ) : (
            <span className={`${s.av} ${hl('me')}`}>{makerName.trim().charAt(0).toUpperCase()}</span>
          )
        ) : (
          <Skeleton w={38} h={38} round />
        )}
        <svg className={s.close} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9C9CA6" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </div>
      <div className={s.who}>
        {makerName ? <span className={`${s.name} ${hl('me')}`}>Hey, I&apos;m {makerName}</span> : <Skeleton w="58%" h={10} />}
        {productName ? <span className={`${s.byline} ${hl('site')}`}>I build {productName} on my own</span> : <Skeleton w="42%" h={9} />}
      </div>
      {headline ? <span className={`${s.headline} ${hl('head')}`}>{headline}</span> : <Skeleton w="70%" h={16} />}
      {message ? (
        <p className={`${s.message} ${hl('msg')}`}>{message}</p>
      ) : (
        <div className={s.lines}>
          <Skeleton w="100%" h={9} />
          <Skeleton w="82%" h={9} />
        </div>
      )}
      <div className={`${s.amts} ${hl('amt')}`}>
        {amounts?.length
          ? amounts.map((a) => (
              <span key={a} className={`${s.amt} ${a === selected ? s.amtOn : ''}`}>
                ${a}
              </span>
            ))
          : [0, 1, 2].map((i) => <Skeleton key={i} h={36} round />)}
      </div>
      <span className={s.pay}>Donate with PayPal</span>
      <div className={s.foot}>
        <span className={s.later}>Maybe later</span>
        <span className={s.powered}>powered by fren</span>
      </div>
    </div>
  )
}

export function AskPreview(props: AskPreviewProps) {
  return (
    <section className={s.panel} aria-label="Live preview">
      <span className={s.title}>Live preview</span>
      <div className={s.win}>
        <div className={s.bar}>
          <span className={s.dot} />
          <span className={s.dot} />
          <span className={s.dot} />
          <span className={s.url} />
          <span style={{ width: 44 }} />
        </div>
        <div className={s.body}>
          <div className={s.aside}>
            <Mock w={56} h={14} bg="--mock-logo" style={{ marginBottom: 10 }} />
            <Mock h={26} bg="--mock-nav" style={{ borderRadius: 6 }} />
            <Mock w="80%" h={10} bg="--mock-item" style={{ marginLeft: 6 }} />
            <Mock w="65%" h={10} bg="--mock-item" style={{ marginLeft: 6 }} />
            <Mock w="72%" h={10} bg="--mock-item" style={{ marginLeft: 6 }} />
          </div>
          <div className={s.content}>
            <Mock w="46%" h={22} bg="--mock-dot" style={{ borderRadius: 6 }} />
            <Mock h={10} bg="--mock-text" />
            <Mock w="92%" h={10} bg="--mock-text" />
            <Mock w="84%" h={10} bg="--mock-text" />
            <Mock h={120} bg="--mock-image" style={{ borderRadius: 10, marginTop: 6 }} />
            <Mock w="88%" h={10} bg="--mock-text" />
            <Mock w="60%" h={10} bg="--mock-text" />
          </div>
        </div>
        <AskToast {...props} />
      </div>
      {props.caption ? <span className={s.caption}>{props.caption}</span> : null}
    </section>
  )
}
