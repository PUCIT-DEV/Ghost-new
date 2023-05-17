const i18next = require('i18next');

const SUPPORTED_LOCALES = [
    'af',
    'bg',
    'ca',
    'cs',
    'da',
    'de',
    'en',
    'eo',
    'es',
    'fr',
    'hu',
    'id',
    'it',
    'mn',
    'nl',
    'no',
    'pl',
    'pt',
    'pt-br',
    'ru',
    'si',
    'sl',
    'sv',
    'tr',
    'uk',
    'uz',
    'vi',
    'zh'
];

/**
 * @param {string} [lng]
 * @param {'ghost'|'portal'|'test'} ns
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
            acc[locale] = {
                [ns]: require(`../locales/${locale}/${ns}.json`)
            };
            return acc;
        }, {})
    });

    return i18nextInstance;
};

module.exports.SUPPORTED_LOCALES = SUPPORTED_LOCALES;
