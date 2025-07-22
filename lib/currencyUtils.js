// All world currencies (180+ official currencies)
export const allCurrencies = [
  // Major currencies (most common)
  { code: 'USD', symbol: '$', name: 'US Dollar', popular: true },
  { code: 'EUR', symbol: '€', name: 'Euro', popular: true },
  { code: 'GBP', symbol: '£', name: 'British Pound', popular: true },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', decimals: 0, popular: true },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', popular: true },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', popular: true },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', popular: true },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', popular: true },
  { code: 'KRW', symbol: '₩', name: 'Korean Won', decimals: 0, popular: true },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', popular: true },
  
  // A-C
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham' },
  { code: 'AFN', symbol: '؋', name: 'Afghan Afghani' },
  { code: 'ALL', symbol: 'L', name: 'Albanian Lek' },
  { code: 'AMD', symbol: '֏', name: 'Armenian Dram' },
  { code: 'ANG', symbol: 'ƒ', name: 'Netherlands Antillean Guilder' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
  { code: 'ARS', symbol: '$', name: 'Argentine Peso' },
  { code: 'AWG', symbol: 'ƒ', name: 'Aruban Florin' },
  { code: 'AZN', symbol: '₼', name: 'Azerbaijani Manat' },
  { code: 'BAM', symbol: 'KM', name: 'Bosnia-Herzegovina Convertible Mark' },
  { code: 'BBD', symbol: '$', name: 'Barbadian Dollar' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev' },
  { code: 'BHD', symbol: '.د.ب', name: 'Bahraini Dinar', decimals: 3 },
  { code: 'BIF', symbol: 'FBu', name: 'Burundian Franc', decimals: 0 },
  { code: 'BMD', symbol: '$', name: 'Bermudan Dollar' },
  { code: 'BND', symbol: '$', name: 'Brunei Dollar' },
  { code: 'BOB', symbol: '$b', name: 'Bolivian Boliviano' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'BSD', symbol: '$', name: 'Bahamian Dollar' },
  { code: 'BTN', symbol: 'Nu.', name: 'Bhutanese Ngultrum' },
  { code: 'BWP', symbol: 'P', name: 'Botswanan Pula' },
  { code: 'BYN', symbol: 'Br', name: 'Belarusian Ruble' },
  { code: 'BZD', symbol: 'BZ$', name: 'Belize Dollar' },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
  { code: 'CLP', symbol: '$', name: 'Chilean Peso', decimals: 0 },
  { code: 'COP', symbol: '$', name: 'Colombian Peso' },
  { code: 'CRC', symbol: '₡', name: 'Costa Rican Colón' },
  { code: 'CUC', symbol: '$', name: 'Cuban Convertible Peso' },
  { code: 'CUP', symbol: '₱', name: 'Cuban Peso' },
  { code: 'CVE', symbol: '$', name: 'Cape Verdean Escudo' },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna' },
  
  // D-H
  { code: 'DJF', symbol: 'Fdj', name: 'Djiboutian Franc', decimals: 0 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone' },
  { code: 'DOP', symbol: 'RD$', name: 'Dominican Peso' },
  { code: 'DZD', symbol: 'دج', name: 'Algerian Dinar' },
  { code: 'EGP', symbol: '£', name: 'Egyptian Pound' },
  { code: 'ERN', symbol: 'Nfk', name: 'Eritrean Nakfa' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'FJD', symbol: '$', name: 'Fijian Dollar' },
  { code: 'FKP', symbol: '£', name: 'Falkland Islands Pound' },
  { code: 'GEL', symbol: '₾', name: 'Georgian Lari' },
  { code: 'GGP', symbol: '£', name: 'Guernsey Pound' },
  { code: 'GHS', symbol: '¢', name: 'Ghanaian Cedi' },
  { code: 'GIP', symbol: '£', name: 'Gibraltar Pound' },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  { code: 'GNF', symbol: 'FG', name: 'Guinean Franc', decimals: 0 },
  { code: 'GTQ', symbol: 'Q', name: 'Guatemalan Quetzal' },
  { code: 'GYD', symbol: '$', name: 'Guyanaese Dollar' },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'HNL', symbol: 'L', name: 'Honduran Lempira' },
  { code: 'HRK', symbol: 'kn', name: 'Croatian Kuna' },
  { code: 'HTG', symbol: 'G', name: 'Haitian Gourde' },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', decimals: 0 },
  
  // I-M
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Sheqel' },
  { code: 'IMP', symbol: '£', name: 'Manx pound' },
  { code: 'IQD', symbol: 'ع.د', name: 'Iraqi Dinar', decimals: 3 },
  { code: 'IRR', symbol: '﷼', name: 'Iranian Rial' },
  { code: 'ISK', symbol: 'kr', name: 'Icelandic Króna', decimals: 0 },
  { code: 'JEP', symbol: '£', name: 'Jersey Pound' },
  { code: 'JMD', symbol: 'J$', name: 'Jamaican Dollar' },
  { code: 'JOD', symbol: 'JD', name: 'Jordanian Dinar', decimals: 3 },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'KGS', symbol: 'лв', name: 'Kyrgystani Som' },
  { code: 'KHR', symbol: '៛', name: 'Cambodian Riel' },
  { code: 'KMF', symbol: 'CF', name: 'Comorian Franc', decimals: 0 },
  { code: 'KPW', symbol: '₩', name: 'North Korean Won' },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', decimals: 3 },
  { code: 'KYD', symbol: '$', name: 'Cayman Islands Dollar' },
  { code: 'KZT', symbol: '₸', name: 'Kazakhstani Tenge' },
  { code: 'LAK', symbol: '₭', name: 'Laotian Kip' },
  { code: 'LBP', symbol: '£', name: 'Lebanese Pound' },
  { code: 'LKR', symbol: '₨', name: 'Sri Lankan Rupee' },
  { code: 'LRD', symbol: '$', name: 'Liberian Dollar' },
  { code: 'LSL', symbol: 'M', name: 'Lesotho Loti' },
  { code: 'LYD', symbol: 'LD', name: 'Libyan Dinar', decimals: 3 },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MDL', symbol: 'lei', name: 'Moldovan Leu' },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  { code: 'MKD', symbol: 'ден', name: 'Macedonian Denar' },
  { code: 'MMK', symbol: 'K', name: 'Myanma Kyat' },
  { code: 'MNT', symbol: '₮', name: 'Mongolian Tugrik' },
  { code: 'MOP', symbol: 'MOP$', name: 'Macanese Pataca' },
  { code: 'MRU', symbol: 'UM', name: 'Mauritanian Ouguiya' },
  { code: 'MUR', symbol: '₨', name: 'Mauritian Rupee' },
  { code: 'MVR', symbol: 'Rf', name: 'Maldivian Rufiyaa' },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  
  // N-S
  { code: 'NAD', symbol: '$', name: 'Namibian Dollar' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'NIO', symbol: 'C$', name: 'Nicaraguan Córdoba' },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee' },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' },
  { code: 'OMR', symbol: '﷼', name: 'Omani Rial', decimals: 3 },
  { code: 'PAB', symbol: 'B/.', name: 'Panamanian Balboa' },
  { code: 'PEN', symbol: 'S/.', name: 'Peruvian Nuevo Sol' },
  { code: 'PGK', symbol: 'K', name: 'Papua New Guinean Kina' },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso' },
  { code: 'PKR', symbol: '₨', name: 'Pakistani Rupee' },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty' },
  { code: 'PYG', symbol: 'Gs', name: 'Paraguayan Guarani', decimals: 0 },
  { code: 'QAR', symbol: '﷼', name: 'Qatari Rial' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
  { code: 'RSD', symbol: 'Дин.', name: 'Serbian Dinar' },
  { code: 'RUB', symbol: '₽', name: 'Russian Ruble' },
  { code: 'RWF', symbol: 'R₣', name: 'Rwandan Franc', decimals: 0 },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal' },
  { code: 'SBD', symbol: '$', name: 'Solomon Islands Dollar' },
  { code: 'SCR', symbol: '₨', name: 'Seychellois Rupee' },
  { code: 'SDG', symbol: 'LS', name: 'Sudanese Pound' },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'SHP', symbol: '£', name: 'Saint Helena Pound' },
  { code: 'SLE', symbol: 'Le', name: 'Sierra Leonean Leone' },
  { code: 'SOS', symbol: 'S', name: 'Somali Shilling' },
  { code: 'SRD', symbol: '$', name: 'Surinamese Dollar' },
  { code: 'SSP', symbol: '£', name: 'South Sudanese Pound' },
  { code: 'STN', symbol: 'Db', name: 'São Tomé and Príncipe Dobra' },
  { code: 'SVC', symbol: '$', name: 'Salvadoran Colón' },
  { code: 'SYP', symbol: '£', name: 'Syrian Pound' },
  { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni' },
  
  // T-Z
  { code: 'THB', symbol: '฿', name: 'Thai Baht' },
  { code: 'TJS', symbol: 'SM', name: 'Tajikistani Somoni' },
  { code: 'TMT', symbol: 'T', name: 'Turkmenistani Manat' },
  { code: 'TND', symbol: 'د.ت', name: 'Tunisian Dinar', decimals: 3 },
  { code: 'TOP', symbol: 'T$', name: 'Tongan Paʻanga' },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira' },
  { code: 'TTD', symbol: 'TT$', name: 'Trinidad and Tobago Dollar' },
  { code: 'TVD', symbol: '$', name: 'Tuvaluan Dollar' },
  { code: 'TWD', symbol: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UAH', symbol: '₴', name: 'Ukrainian Hryvnia' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling', decimals: 0 },
  { code: 'UYU', symbol: '$U', name: 'Uruguayan Peso' },
  { code: 'UYW', symbol: 'UYW', name: 'Unidad Previsional' },
  { code: 'UZS', symbol: 'лв', name: 'Uzbekistan Som' },
  { code: 'VED', symbol: 'Bs.', name: 'Venezuelan Bolívar' },
  { code: 'VES', symbol: 'Bs.S', name: 'Venezuelan Bolívar Soberano' },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', decimals: 0 },
  { code: 'VUV', symbol: 'VT', name: 'Vanuatu Vatu', decimals: 0 },
  { code: 'WST', symbol: 'WS$', name: 'Samoan Tala' },
  { code: 'XAF', symbol: 'FCFA', name: 'CFA Franc BEAC', decimals: 0 },
  { code: 'XCD', symbol: '$', name: 'East Caribbean Dollar' },
  { code: 'XDR', symbol: 'SDR', name: 'Special Drawing Rights' },
  { code: 'XOF', symbol: 'CFA', name: 'CFA Franc BCEAO', decimals: 0 },
  { code: 'XPF', symbol: '₣', name: 'CFP Franc', decimals: 0 },
  { code: 'YER', symbol: '﷼', name: 'Yemeni Rial' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'ZMW', symbol: 'ZK', name: 'Zambian Kwacha' },
  { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar' }
];

// Comprehensive locale to currency mapping (language-country codes and base languages)
export const localeToCountryMap = {
  // English variants
  'en-US': 'US', 'en-CA': 'CA', 'en-GB': 'GB', 'en-AU': 'AU', 'en-NZ': 'NZ',
  'en-ZA': 'ZA', 'en-IN': 'IN', 'en-SG': 'SG', 'en-HK': 'HK', 'en-IE': 'IE',
  
  // European languages/countries
  'de': 'DE', 'de-DE': 'DE', 'de-AT': 'AT', 'de-CH': 'CH',
  'fr': 'FR', 'fr-FR': 'FR', 'fr-CA': 'CA', 'fr-CH': 'CH', 'fr-BE': 'BE',
  'es': 'ES', 'es-ES': 'ES', 'es-MX': 'MX', 'es-AR': 'AR', 'es-CO': 'CO',
  'es-CL': 'CL', 'es-PE': 'PE', 'es-VE': 'VE', 'es-UY': 'UY', 'es-PY': 'PY',
  'it': 'IT', 'it-IT': 'IT', 'it-CH': 'CH',
  'nl': 'NL', 'nl-NL': 'NL', 'nl-BE': 'BE',
  'pt': 'PT', 'pt-PT': 'PT', 'pt-BR': 'BR',
  'sv': 'SE', 'sv-SE': 'SE', 'no': 'NO', 'nb': 'NO', 'nn': 'NO',
  'da': 'DK', 'da-DK': 'DK', 'fi': 'FI', 'fi-FI': 'FI',
  'pl': 'PL', 'pl-PL': 'PL', 'cs': 'CZ', 'cs-CZ': 'CZ',
  'hu': 'HU', 'hu-HU': 'HU', 'sk': 'SK', 'sk-SK': 'SK',
  'hr': 'HR', 'hr-HR': 'HR', 'sl': 'SI', 'sl-SI': 'SI',
  'bg': 'BG', 'bg-BG': 'BG', 'ro': 'RO', 'ro-RO': 'RO',
  'lv': 'LV', 'lv-LV': 'LV', 'lt': 'LT', 'lt-LT': 'LT', 'et': 'EE', 'et-EE': 'EE',
  'el': 'GR', 'el-GR': 'GR', 'mt': 'MT', 'mt-MT': 'MT',
  
  // Asian languages/countries
  'ja': 'JP', 'ja-JP': 'JP', 'ko': 'KR', 'ko-KR': 'KR',
  'zh': 'CN', 'zh-CN': 'CN', 'zh-TW': 'TW', 'zh-HK': 'HK', 'zh-SG': 'SG',
  'hi': 'IN', 'hi-IN': 'IN', 'bn': 'BD', 'bn-BD': 'BD', 'bn-IN': 'IN',
  'th': 'TH', 'th-TH': 'TH', 'vi': 'VN', 'vi-VN': 'VN',
  'id': 'ID', 'id-ID': 'ID', 'ms': 'MY', 'ms-MY': 'MY',
  'tl': 'PH', 'fil': 'PH', 'ur': 'PK', 'ur-PK': 'PK',
  'ta': 'IN', 'te': 'IN', 'ml': 'IN', 'kn': 'IN', 'gu': 'IN',
  'my': 'MM', 'my-MM': 'MM', 'km': 'KH', 'km-KH': 'KH',
  'lo': 'LA', 'lo-LA': 'LA', 'si': 'LK', 'si-LK': 'LK',
  'ne': 'NP', 'ne-NP': 'NP', 'dz': 'BT', 'dz-BT': 'BT',
  
  // Middle Eastern/African languages
  'ar': 'SA', 'ar-SA': 'SA', 'ar-AE': 'AE', 'ar-EG': 'EG',
  'ar-QA': 'QA', 'ar-KW': 'KW', 'ar-BH': 'BH', 'ar-OM': 'OM',
  'ar-JO': 'JO', 'ar-LB': 'LB', 'ar-SY': 'SY', 'ar-IQ': 'IQ',
  'ar-MA': 'MA', 'ar-DZ': 'DZ', 'ar-TN': 'TN', 'ar-LY': 'LY',
  'fa': 'IR', 'fa-IR': 'IR', 'he': 'IL', 'he-IL': 'IL',
  'tr': 'TR', 'tr-TR': 'TR', 'ku': 'IQ', 'ckb': 'IQ',
  'sw': 'TZ', 'sw-TZ': 'TZ', 'sw-KE': 'KE', 'am': 'ET', 'am-ET': 'ET',
  'ha': 'NG', 'yo': 'NG', 'ig': 'NG', 'zu': 'ZA', 'xh': 'ZA',
  'af': 'ZA', 'af-ZA': 'ZA', 'st': 'LS', 'tn': 'BW',
  
  // Other languages
  'ru': 'RU', 'ru-RU': 'RU', 'uk': 'UA', 'uk-UA': 'UA',
  'be': 'BY', 'be-BY': 'BY', 'kk': 'KZ', 'kk-KZ': 'KZ',
  'ky': 'KG', 'ky-KG': 'KG', 'uz': 'UZ', 'uz-UZ': 'UZ',
  'tg': 'TJ', 'tg-TJ': 'TJ', 'mn': 'MN', 'mn-MN': 'MN',
  'ka': 'GE', 'ka-GE': 'GE', 'hy': 'AM', 'hy-AM': 'AM',
  'az': 'AZ', 'az-AZ': 'AZ', 'is': 'IS', 'is-IS': 'IS',
  'fo': 'FO', 'ga': 'IE', 'ga-IE': 'IE', 'cy': 'GB', 'cy-GB': 'GB',
  'eu': 'ES', 'ca': 'ES', 'ca-ES': 'ES', 'gl': 'ES', 'gl-ES': 'ES'
};

// Country code to currency mapping
export const countryToCurrencyMap = {
  // Popular countries/currencies
  'US': 'USD', 'CA': 'CAD', 'GB': 'GBP', 'FR': 'EUR', 'DE': 'EUR',
  'IT': 'EUR', 'ES': 'EUR', 'NL': 'EUR', 'BE': 'EUR', 'AT': 'EUR',
  'JP': 'JPY', 'CN': 'CNY', 'KR': 'KRW', 'AU': 'AUD', 'NZ': 'NZD',
  'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK', 'IN': 'INR',
  
  // All other countries A-Z
  'AD': 'EUR', 'AE': 'AED', 'AF': 'AFN', 'AG': 'XCD', 'AI': 'XCD',
  'AL': 'ALL', 'AM': 'AMD', 'AO': 'AOA', 'AR': 'ARS', 'AS': 'USD',
  'AW': 'AWG', 'AZ': 'AZN', 'BA': 'BAM', 'BB': 'BBD', 'BD': 'BDT',
  'BF': 'XOF', 'BG': 'BGN', 'BH': 'BHD', 'BI': 'BIF', 'BJ': 'XOF',
  'BM': 'BMD', 'BN': 'BND', 'BO': 'BOB', 'BR': 'BRL', 'BS': 'BSD',
  'BT': 'BTN', 'BW': 'BWP', 'BY': 'BYN', 'BZ': 'BZD', 'CD': 'CDF',
  'CF': 'XAF', 'CG': 'XAF', 'CI': 'XOF', 'CL': 'CLP', 'CM': 'XAF',
  'CO': 'COP', 'CR': 'CRC', 'CU': 'CUP', 'CV': 'CVE', 'CZ': 'CZK',
  'DJ': 'DJF', 'DM': 'XCD', 'DO': 'DOP', 'DZ': 'DZD', 'EC': 'USD',
  'EE': 'EUR', 'EG': 'EGP', 'ER': 'ERN', 'ET': 'ETB', 'FI': 'EUR',
  'FJ': 'FJD', 'FK': 'FKP', 'FM': 'USD', 'FO': 'DKK', 'GA': 'XAF',
  'GD': 'XCD', 'GE': 'GEL', 'GF': 'EUR', 'GG': 'GGP', 'GH': 'GHS',
  'GI': 'GIP', 'GL': 'DKK', 'GM': 'GMD', 'GN': 'GNF', 'GP': 'EUR',
  'GQ': 'XAF', 'GR': 'EUR', 'GT': 'GTQ', 'GU': 'USD', 'GW': 'XOF',
  'GY': 'GYD', 'HK': 'HKD', 'HN': 'HNL', 'HR': 'HRK', 'HT': 'HTG',
  'HU': 'HUF', 'ID': 'IDR', 'IE': 'EUR', 'IL': 'ILS', 'IM': 'IMP',
  'IQ': 'IQD', 'IR': 'IRR', 'IS': 'ISK', 'JE': 'JEP', 'JM': 'JMD',
  'JO': 'JOD', 'KE': 'KES', 'KG': 'KGS', 'KH': 'KHR', 'KI': 'AUD',
  'KM': 'KMF', 'KN': 'XCD', 'KP': 'KPW', 'KW': 'KWD', 'KY': 'KYD',
  'KZ': 'KZT', 'LA': 'LAK', 'LB': 'LBP', 'LC': 'XCD', 'LI': 'CHF',
  'LK': 'LKR', 'LR': 'LRD', 'LS': 'LSL', 'LT': 'EUR', 'LU': 'EUR',
  'LV': 'EUR', 'LY': 'LYD', 'MA': 'MAD', 'MC': 'EUR', 'MD': 'MDL',
  'ME': 'EUR', 'MF': 'EUR', 'MG': 'MGA', 'MH': 'USD', 'MK': 'MKD',
  'ML': 'XOF', 'MM': 'MMK', 'MN': 'MNT', 'MO': 'MOP', 'MP': 'USD',
  'MQ': 'EUR', 'MR': 'MRU', 'MS': 'XCD', 'MT': 'EUR', 'MU': 'MUR',
  'MV': 'MVR', 'MW': 'MWK', 'MX': 'MXN', 'MY': 'MYR', 'MZ': 'MZN',
  'NA': 'NAD', 'NC': 'XPF', 'NE': 'XOF', 'NF': 'AUD', 'NG': 'NGN',
  'NI': 'NIO', 'NP': 'NPR', 'NR': 'AUD', 'NU': 'NZD', 'OM': 'OMR',
  'PA': 'PAB', 'PE': 'PEN', 'PF': 'XPF', 'PG': 'PGK', 'PH': 'PHP',
  'PK': 'PKR', 'PL': 'PLN', 'PM': 'EUR', 'PN': 'NZD', 'PR': 'USD',
  'PS': 'ILS', 'PT': 'EUR', 'PW': 'USD', 'PY': 'PYG', 'QA': 'QAR',
  'RE': 'EUR', 'RO': 'RON', 'RS': 'RSD', 'RU': 'RUB', 'RW': 'RWF',
  'SA': 'SAR', 'SB': 'SBD', 'SC': 'SCR', 'SD': 'SDG', 'SG': 'SGD',
  'SH': 'SHP', 'SI': 'EUR', 'SJ': 'NOK', 'SK': 'EUR', 'SL': 'SLE',
  'SM': 'EUR', 'SN': 'XOF', 'SO': 'SOS', 'SR': 'SRD', 'SS': 'SSP',
  'ST': 'STN', 'SV': 'USD', 'SX': 'ANG', 'SY': 'SYP', 'SZ': 'SZL',
  'TC': 'USD', 'TD': 'XAF', 'TF': 'EUR', 'TG': 'XOF', 'TH': 'THB',
  'TJ': 'TJS', 'TK': 'NZD', 'TL': 'USD', 'TM': 'TMT', 'TN': 'TND',
  'TO': 'TOP', 'TR': 'TRY', 'TT': 'TTD', 'TV': 'TVD', 'TW': 'TWD',
  'TZ': 'TZS', 'UA': 'UAH', 'UG': 'UGX', 'UM': 'USD', 'UY': 'UYU',
  'UZ': 'UZS', 'VA': 'EUR', 'VC': 'XCD', 'VE': 'VES', 'VG': 'USD',
  'VI': 'USD', 'VN': 'VND', 'VU': 'VUV', 'WF': 'XPF', 'WS': 'WST',
  'XK': 'EUR', 'YE': 'YER', 'YT': 'EUR', 'ZA': 'ZAR', 'ZM': 'ZMW',
  'ZW': 'ZWL'
};

/**
 * Get currency info by currency code
 */
export const getCurrencyInfo = (code) => {
  return allCurrencies.find(c => c.code === code) || allCurrencies[0];
};

/**
 * Get currency from browser locale with improved detection
 */
export const getCurrencyFromLocale = () => {
  try {
    const userLocale = navigator.language || navigator.languages?.[0] || 'en-US';
    console.log('🌍 Detected browser locale:', userLocale);
    console.log('🌍 All navigator languages:', navigator.languages);
    
    // First try to get country from locale
    let detectedCountry = null;
    
    // Direct locale mapping
    if (localeToCountryMap[userLocale]) {
      detectedCountry = localeToCountryMap[userLocale];
      console.log(`🌍 Found direct mapping: ${userLocale} -> ${detectedCountry}`);
    } else {
      // Try base language
      const baseLocale = userLocale.split('-')[0];
      console.log(`🌍 Trying base locale: ${baseLocale}`);
      if (localeToCountryMap[baseLocale]) {
        detectedCountry = localeToCountryMap[baseLocale];
        console.log(`🌍 Found base mapping: ${baseLocale} -> ${detectedCountry}`);
      } else {
        // Try extracting country from locale (e.g., 'tr-TR' -> 'TR')
        const localeParts = userLocale.split('-');
        console.log(`🌍 Locale parts:`, localeParts);
        if (localeParts.length > 1) {
          const countryFromLocale = localeParts[1].toUpperCase();
          console.log(`🌍 Trying country from locale: ${countryFromLocale}`);
          if (countryToCurrencyMap[countryFromLocale]) {
            detectedCountry = countryFromLocale;
            console.log(`🌍 Found country mapping: ${countryFromLocale} -> ${detectedCountry}`);
          }
        }
      }
    }
    
    // Get currency from country
    if (detectedCountry && countryToCurrencyMap[detectedCountry]) {
      const detectedCurrency = countryToCurrencyMap[detectedCountry];
      console.log(`🌍 Locale ${userLocale} -> Country ${detectedCountry} -> Currency ${detectedCurrency}`);
      return detectedCurrency;
    }
    
    // Fallback: try using Intl.NumberFormat to detect currency
    try {
      const formatter = new Intl.NumberFormat(userLocale, { style: 'currency', currency: 'USD' });
      const parts = formatter.formatToParts(0);
      const currencyPart = parts.find(part => part.type === 'currency');
      
      // Try to match currency symbol to known currencies
      if (currencyPart) {
        const matchingCurrency = allCurrencies.find(c => c.symbol === currencyPart.value);
        if (matchingCurrency) {
          console.log(`🌍 Detected currency from Intl: ${matchingCurrency.code}`);
          return matchingCurrency.code;
        }
      }
    } catch (intlError) {
      console.warn('🌍 Intl.NumberFormat fallback failed:', intlError);
    }
    
    console.log('🌍 No currency detected, falling back to USD');
    return 'USD';
  } catch {
    console.log('🌍 Locale detection failed, falling back to USD');
    return 'USD';
  }
};

/**
 * Get currency from geolocation coordinates
 */
export const getCurrencyFromLocation = async (latitude, longitude) => {
  try {
    console.log(`🌍 Detecting currency from coordinates: ${latitude}, ${longitude}`);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=3`
    );
    
    if (!response.ok) {
      throw new Error('Geolocation API failed');
    }
    
    const data = await response.json();
    
    // Extract country code from address
    const countryCode = data.address?.country_code?.toUpperCase();
    
    if (countryCode && countryToCurrencyMap[countryCode]) {
      const currency = countryToCurrencyMap[countryCode];
      console.log(`🌍 Location ${latitude},${longitude} -> Country ${countryCode} -> Currency ${currency}`);
      return currency;
    }
    
    console.log('🌍 Could not determine currency from location');
    return null;
  } catch (error) {
    console.error('🌍 Error getting currency from location:', error);
    return null;
  }
};

/**
 * Format price input based on currency decimal rules
 */
export const formatPriceInput = (value, currencyCode) => {
  const currencyInfo = getCurrencyInfo(currencyCode);
  
  if (currencyInfo.decimals === 0) {
    // Zero decimal currencies (like JPY, KRW) - only allow whole numbers
    return value.replace(/[^\d]/g, '');
  } else if (currencyInfo.decimals === 3) {
    // Three decimal currencies (like BHD, KWD) - allow up to 3 decimals
    return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{3})\d+/g, '$1');
  } else {
    // Standard 2 decimal currencies
    return value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1').replace(/(\.\d{2})\d+/g, '$1');
  }
};

/**
 * Get recent currencies from localStorage
 */
export const getRecentCurrencies = () => {
  try {
    const recent = localStorage.getItem('recentCurrencies');
    return recent ? JSON.parse(recent) : [];
  } catch {
    return [];
  }
};

/**
 * Save currency to recent list
 */
export const saveRecentCurrency = (currencyCode) => {
  try {
    const recent = getRecentCurrencies();
    const updated = [currencyCode, ...recent.filter(c => c !== currencyCode)].slice(0, 3);
    localStorage.setItem('recentCurrencies', JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving recent currency:', error);
  }
};

/**
 * Smart currency detection combining locale and location
 */
/**
 * Get display text for currency (symbol for major ones, code for others)
 */
export const getCurrencyDisplay = (currencyCode) => {
  const majorCurrencies = {
    'USD': '$',
    'EUR': '€', 
    'GBP': '£'
  };
  
  return majorCurrencies[currencyCode] || currencyCode;
};

/**
 * Get currency code from country name (e.g. 'Turkey' -> 'TRY')
 */
export const getCurrencyFromCountryName = (countryName) => {
  if (!countryName) return null;
  // Map of country names to ISO country codes (partial, add more as needed)
  const nameToCode = {
    'United States': 'US',
    'Turkey': 'TR',
    'France': 'FR',
    'Germany': 'DE',
    'Italy': 'IT',
    'Spain': 'ES',
    'United Kingdom': 'GB',
    'Canada': 'CA',
    'Australia': 'AU',
    'Japan': 'JP',
    'China': 'CN',
    'South Korea': 'KR',
    'India': 'IN',
    'Russia': 'RU',
    'Brazil': 'BR',
    'Mexico': 'MX',
    'Netherlands': 'NL',
    'Switzerland': 'CH',
    'Sweden': 'SE',
    'Norway': 'NO',
    'Denmark': 'DK',
    'Finland': 'FI',
    'Greece': 'GR',
    'Poland': 'PL',
    'Portugal': 'PT',
    'Belgium': 'BE',
    'Austria': 'AT',
    'Ireland': 'IE',
    'Czechia': 'CZ',
    'Czech Republic': 'CZ',
    'Hungary': 'HU',
    'Romania': 'RO',
    'Bulgaria': 'BG',
    'Croatia': 'HR',
    'Slovakia': 'SK',
    'Slovenia': 'SI',
    'Estonia': 'EE',
    'Latvia': 'LV',
    'Lithuania': 'LT',
    'Ukraine': 'UA',
    'Serbia': 'RS',
    'Turkey': 'TR',
    'Egypt': 'EG',
    'South Africa': 'ZA',
    'New Zealand': 'NZ',
    // ... add more as needed ...
  };
  const code = nameToCode[countryName.trim()];
  if (code && countryToCurrencyMap[code]) {
    return countryToCurrencyMap[code];
  }
  return null;
};

export const getSmartCurrencyGuess = async (userLocation = null) => {
  console.log('🌍 Starting smart currency detection...');
  
  // First try location-based detection if coordinates available
  if (userLocation?.latitude && userLocation?.longitude) {
    const locationCurrency = await getCurrencyFromLocation(
      userLocation.latitude, 
      userLocation.longitude
    );
    if (locationCurrency) {
      return locationCurrency;
    }
  }
  
  // Fallback to locale-based detection
  return getCurrencyFromLocale();
}; 