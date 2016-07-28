// Supported formats of https://github.com/image-size/image-size:
// BMP, GIF, JPEG, PNG, PSD, TIFF, WebP, SVG
// ***
// Takes the url of the image and an optional timeout
// getImageSizeFromUrl returns an Object like this
// {
//     height: 50,
//     url: 'http://myblog.com/images/cat.jpg',
//     width: 50
// };
// if the dimensions can be fetched and returns the url back, if not.
// ***
// In case we get a locally stored image or a not complete url (like //www.gravatar.com/andsoon),
// we add the protocol to the incomplete one and use urlFor() to get the absolute URL.
// If the request fails or image-size is not able to read the file, we return the original URL.

var sizeOf = require('image-size'),
    url = require('url'),
    Promise = require('bluebird'),
    http = require('http'),
    https = require('https'),
    config = require('../config'),
    dimensions,
    request,
    prot;

/**
 * @description read image dimensions from URL
 * @param {String} imagePath
 * @param {Number} timeout
 * @returns {Promise<Object>} imageObject
 * Always returns {string} imagePath
 */
module.exports.getImageSizeFromUrl = function getImageSizeFromUrl(imagePath, timeout) {
    return new Promise(function imageSizeRequest(resolve) {
        var timer,
            imageObject = {},
            timerEnded = false,
            options;

        imageObject.url = imagePath;

        // check if we got an url without any protocol
        if (imagePath.indexOf('http') === -1) {
            // our gravatar urls start with '//' in that case add 'http:'
            if (imagePath.indexOf('//') === 0) {
                // it's a gravatar url
                imagePath = 'http:' + imagePath;
            } else {
                // get absolute url for image
                imagePath = config.urlFor('image', {image: imagePath}, true);
            }
        }

        options = url.parse(imagePath);

        prot = imagePath.indexOf('https') === 0 ? https : http;
        options.headers = {'User-Agent': 'Mozilla/5.0'};

        request = prot.get(options, function (res) {
            var chunks = [];
            clearTimeout(timer);

            res.on('data', function (chunk) {
                chunks.push(chunk);
            });

            res.on('end', function () {
                if (res.statusCode === 200 && !timerEnded) {
                    try {
                        dimensions = sizeOf(Buffer.concat(chunks));

                        imageObject.width = dimensions.width;
                        imageObject.height = dimensions.height;

                        return resolve(imageObject);
                    } catch (err) {
                        // @ToDo: add real error handling here as soon as we have error logging
                        return resolve(imagePath);
                    }
                } else {
                    return resolve(imagePath);
                }
            });
        }).on('error', function () {
            clearTimeout(timer);
            // just resolve with no image url
            if (!timerEnded) {
                return resolve(imagePath);
            }
        });
        timer = setTimeout(function () {
            timerEnded = true;
            request.abort();

            return resolve(imagePath);
        }, timeout || 2000);
    });
};
