export default {
  languageTag: 'zh-CN',
  delimiters: {
    thousands: ',',
    decimal: '.'
  },
  abbreviations: {
    thousand: 'åƒ',
    million: 'ç™¾ä¸‡',
    billion: 'åäº¿',
    trillion: 'å…†'
  },
  ordinal() {
    return '.'
  },
  currency: {
    symbol: 'Â¥',
    position: 'prefix',
    code: 'CNY'
  },
  currencyFormat: {
    thousandSeparated: true,
    totalLength: 4,
    spaceSeparated: true,
    average: true
  },
  formats: {
    fourDigits: {
      totalLength: 4,
      spaceSeparated: true,
      average: true
    },
    fullWithTwoDecimals: {
      thousandSeparated: true,
      mantissa: 2
    },
    fullWithTwoDecimalsNoCurrency: {
      mantissa: 2,
      thousandSeparated: true
    },
    fullWithNoDecimals: {
      output: 'currency',
      thousandSeparated: true,
      mantissa: 0
    }
  }
}
