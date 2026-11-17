import { createI18n } from 'vue-i18n'

import messages from '@/langs/index.js'
import { LOCALES_NAMES } from '@/constants/variables.js'

let lang = 'en'

const locale = localStorage.getItem('lang') || navigator.language.slice(0, 2).toLowerCase()
if (messages[locale]) {
  lang = locale
}

const dateTimeFormats = {
  en: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }
  },
  es: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  },
  fr: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  },
  ru: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  },
  tr: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  },
  uk: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }
  },
  zh: {
    long: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }
  }
}

const numberFormats = {
  en: {
    compact: {
      notation: 'compact'
    }
  },
  es: {
    compact: {
      notation: 'compact'
    }
  },
  fr: {
    compact: {
      notation: 'compact'
    }
  },
  ru: {
    compact: {
      notation: 'compact'
    }
  },
  tr: {
    compact: {
      notation: 'compact'
    }
  },
  uk: {
    compact: {
      notation: 'compact'
    }
  },
  zh: {
    compact: {
      notation: 'compact'
    }
  }
}

function slavicPluralization(choice, choicesLength) {
  /**
   * @param choice {number} a choice index given by the input to $t: `$t('path.to.rule', choiceIndex)`
   * @param choicesLength {number} an overall amount of available choices
   * @returns a final choice index to select plural word by
   */

  if (choice === 0) {
    return 0
  }

  const teen = choice > 10 && choice < 20
  const endsWithOne = choice % 10 === 1

  if (choicesLength < 4) {
    return !teen && endsWithOne ? 1 : 2
  }
  if (!teen && endsWithOne) {
    return 1
  }
  if (!teen && choice % 10 >= 2 && choice % 10 <= 4) {
    return 2
  }

  return choicesLength < 4 ? 2 : 3
}

const pluralRules = {
  ru: slavicPluralization,
  uk: slavicPluralization
}

// legacy: true keeps the Options API style ($t, app.i18n.t) used across this codebase
export const i18n = createI18n({
  legacy: true,
  globalInjection: true,
  locale: lang,
  fallbackLocale: 'en',
  messages,
  silentFallbackWarn: true,
  datetimeFormats: dateTimeFormats,
  numberFormats: numberFormats,
  pluralRules
})

export function setupI18nLocales() {
  let momentLang = i18n.global.locale
  if (momentLang === 'zh') {
    momentLang += '-cn'
  }
  return momentLang
}

export { LOCALES_NAMES }
