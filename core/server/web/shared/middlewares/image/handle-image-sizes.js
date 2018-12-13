const path = require('path');
const sharp = require('sharp');
const storage = require('../../../../adapters/storage');
const activeTheme = require('../../../../services/themes/active');

const SIZE_PATH_REGEX = /^\/sizes\/([^/]+)\//;

module.exports = function (req, res, next) {
    const storageInstance = storage.getStorage();
    const imageSizes = activeTheme.get().config('image_sizes');

    if (!SIZE_PATH_REGEX.test(req.url)) {
        return next();
    }

    const [sizeImageDir, requestedSize] = req.url.match(SIZE_PATH_REGEX);

    // CASE: unknown size or missing size config
    const imageSizeConfig = imageSizes[requestedSize];
    if (!imageSizeConfig || (!imageSizeConfig.width && !imageSizeConfig.height)) {
        const url = req.originalUrl.replace(`/sizes/${requestedSize}`, '');
        return res.redirect(url);
    }

    // CASE: unsupported storage adapter but theme is using custom image_sizes
    if (typeof storageInstance.saveRaw !== 'function') {
        const url = req.originalUrl.replace(`/sizes/${requestedSize}`, '');
        return res.redirect(url);
    }

    storageInstance.exists(req.url).then((exists) => {
        if (exists) {
            return;
        }

        const originalImagePath = path.relative(sizeImageDir, req.url);

        return storageInstance.read({path: originalImagePath})
            .then((originalImageBuffer) => {
                return sharp(originalImageBuffer)
                    .resize(imageSizeConfig.width, imageSizeConfig.height, {
                        withoutEnlargement: true
                    })
                    .toBuffer();
            })
            .then((resizedImageBuffer) => {
                return storageInstance.saveRaw(resizedImageBuffer, req.url);
            });
    }).then(() => {
        next();
    }).catch(next);
};
