'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.removeNonGsmChars = exports.isGsmChar = exports.getCharCount = undefined;

var _SmsUtil = require('./SmsUtil');

/**
 * Returns an object with the following values:
 * - charCount: <number>        // number of characters in input text
 * - msgCount: <number>         // number of sms message parts needed for the input text
 * - charPerSegment: <number>   // number of characters that will fit inside each message part
 * - encoding: <'GSM'/'UCS2'>   // the encoding required for the input text, any non-gsm text will use UCS2
 */
function getCharCount(text) {
    var ret = (0, _SmsUtil.getSmsCharCountInfo)(text);
    if (ret.isGsmEncoding) {
        ret.gsmCharCount.encoding = 'GSM';
        return ret.gsmCharCount;
    } else {
        ret.ucs2CharCount.encoding = 'UCS2';
        return ret.ucs2CharCount;
    }
}

/**
 * Replace all non-gsm charset characters in the msgText string.
 * Some characters will be mapped to valid gsm characters:
 * - ‘’‚`   (mapped to single quote)
 * - “”„«»  (mapped to double quotes)
 * - …      (mapped to '...')
 * - –—     (mapped to -)
 * - others will be mapped to ?
 */
function removeNonGsmChars(msgText) {
    var replacementChar = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '?';

    if (typeof msgText !== 'string' && !(msgText instanceof String)) {
        return '';
    }

    msgText = msgText.replace(/[\u2018\u2019\u201A`]/g, "\'").replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, "\"").replace(/\u2026/g, "...").replace(/[\u2013\u2014]/g, "-");

    return (0, _SmsUtil.replaceNonGsmChars)(msgText, replacementChar);
}

exports.getCharCount = getCharCount;
exports.isGsmChar = _SmsUtil.isGsmChar;
exports.removeNonGsmChars = removeNonGsmChars;