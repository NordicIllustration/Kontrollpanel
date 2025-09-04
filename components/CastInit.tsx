'use client'

import { useEffect } from 'react'

// Standard-ID för Chromecasts inbyggda mediaspelare (Default Media Receiver)
const DEFAULT_APP_ID = 'CC1AD845'

export default function CastInit() {
  useEffect(() => {
    function initCast() {
      const w = window as any
      const cast = w.cast
      const chromeCast = w.chrome?.cast

      if (!cast?.framework) return

      const context = cast.framework.CastContext.getInstance()

      // Bygg options säkert (AutoJoinPolicy kan saknas i vissa laddningsordningar)
      const opts: any = {
        receiverApplicationId: DEFAULT_APP_ID,
      }

      const autoJoinFromCast =
        cast.framework?.AutoJoinPolicy?.TAB_AND_ORIGIN_SCOPED
      const autoJoinFromChrome =
        chromeCast?.AutoJoinPolicy?.TAB_AND_ORIGIN_SCOPED

      if (autoJoinFromCast) {
        opts.autoJoinPolicy = autoJoinFromCast
      } else if (autoJoinFromChrome) {
        opts.autoJoinPolicy = autoJoinFromChrome
      }
      // Om ingen policy hittas låter vi bli att sätta den – det funkar ändå.

      context.setOptions(opts)
    }

    // Om ramverket redan finns – initiera direkt
    if ((window as any).cast?.framework) {
      initCast()
      return
    }

    // Annars vänta på att SDK säger att det är redo
    ;(window as any).__onGCastApiAvailable = function (isAvailable: boolean) {
      if (isAvailable) initCast()
    }
  }, [])

  return null
}
