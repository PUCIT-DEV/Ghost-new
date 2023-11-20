const i18next = require('i18next');

const SUPPORTED_LOCALES = [
    'af', // Afrikaans
    'bg', // Bulgarian
    'ca', // Catalan
    'cs', // Czech
    'da', // Danish
    'de', // German
    'en', // English
    'eo', // Esperanto
    'es', // Spanish
    'fi', // Finnish
    'fr', // French
    'hr', // Croatian
    'hu', // Hungarian
    'id', // Indonesian
    'is', // Icelandic
    'it', // Italian
    'ja', // Japanese
    'ko', // Korean
    'mn', // Mongolian
    'ms', // Malay
    'nl', // Dutch
    'nn', // Norwegian Nynorsk
    'no', // Norwegian
    'pl', // Polish
    'pt', // Portuguese
    'pt-BR', // Portuguese (Brazil)
    'ro', // Romanian
    'ru', // Russian
    'si', // Sinhala
    'sk', // Slovak
    'sl', // Slovenian
    'sq', // Albanian
    'sr', // Serbian
    'sv', // Swedish
    'tr', // Turkish
    'uk', // Ukrainian
    'uz', // Uzbek
    'vi', // Vietnamese
    'zh', // Chinese
    'zh-Hant' // Traditional Chinese
];

/**
 * @param {string} [lng]
 * @param {'ghost'|'portal'|'test'|'signup-form'|'comments'} ns
 */
module.exports = (lng = 'en', ns = 'portal') => {
    const i18nextInstance = i18next.createInstance();
    i18nextInstance.init({
        lng,

        // allow keys to be phrases having `:`, `.`
        nsSeparator: false,
        keySeparator: false,

        // if the value is an empty string, return the key
        returnEmptyString: false,

        // do not load a fallback
        fallbackLng: false,

        ns: ns,
        defaultNS: ns,

        resources: SUPPORTED_LOCALES.reduce((acc, locale) => {
            const res = require(`../locales/${locale}/${ns}.json`);

            // Note: due some random thing in TypeScript, 'requiring' a JSON file with a space in a key name, only adds it to the default export
            // If changing this behaviour, please also check the comments and signup-form apps in another language (mainly sentences with a space in them)
            acc[locale] = {
                [ns]: {...res, ...(res.default && typeof res.default === 'object' ? res.default : {})}
            };
            return acc;
        }, {})
    });

    return i18nextInstance;
};

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
