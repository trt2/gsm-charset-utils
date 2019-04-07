'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var SMS_BYTES = 140;
var SMS_CONCAT_UDH_BYTES = 6;
var SMS_CONCAT_UD_BYTES = SMS_BYTES - SMS_CONCAT_UDH_BYTES;
var GSM_CHARS_PER_SEGMENT = Math.floor(SMS_CONCAT_UD_BYTES * 8 / 7);
var UCS2_CHARS_PER_SEGMENT = Math.floor(SMS_CONCAT_UD_BYTES / 2);

var GSM_CHARS_SINGLE_SEGMENT = Math.floor(SMS_BYTES * 8 / 7);
var UCS2_CHARS_SINGLE_SEGMENT = Math.floor(SMS_BYTES / 2);

var GSM_ALPHABET_EXTENDED = '\f^{}\\[~]|\u20AC';

var GSM_ALPHABET = '@\xA3$\xA5\xE8\xE9\xF9\xEC\xF2\xE7\n\xD8\xF8\r\xC5\xE5\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\xA0\xC6\xE6\xDF' + '\xC9 !"#\xA4%&\'()*+,-./0123456789:;<=' + '>?\xA1ABCDEFGHIJKLMNOPQRSTUVWXYZ\xC4\xD6' + '\xD1\xDC\xA7\xBFabcdefghijklmnopqrstuvwxyz\xE4' + '\xF6\xF1\xFC\xE0';

function isHighSurrogateCode(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogateCode(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

/**
 * The function below calculate the number of characters and segments are needed
 * for the given text. It takes into consideration the extended GSM characters that
 * requires an additional escape character, and surrogate pairs for UCS2 characters.
 * An SMS text message consisting of multiple segments, may not have a segment that
 * ends with the escape character for GSM charaters, so the entire 2 character sequence
 * need to be moved to the next segment. The same applies for UCS2 surrogate pairs.
 * A surrogate pair may not span segments.
 * 
 * Returns an object with the following values:
 * - isGsmEncoding: <boolean>       // Are all characters contained in the GSM7 alphabet?
 * - gsmCharCount: { 
 *      charCount: <number>,        // number of characters in input text
 *      msgCount: <number>,         // number of sms message parts needed for the input text
 *      charsPerSegment: <number>   // number of characters that will fit inside each message part
 *  }
 * - ucs2CharCount: { 
 *      charCount: <number>,        // number of characters in input text
 *      msgCount: <number>,         // number of sms message parts needed for the input text
 *      charsPerSegment: <number>   // number of characters that will fit inside each message part
 *  }
 * 
 * The functions returns information for both the GSM encoding and UCS2. If the text is determined to be
 * UCS2, the GSM information assumes that all non-supported characters are replaced with ? (question mark)
 * or similar.
 */
function getCharCountInfo(text) {
    var gsmCharCount = {
        charCount: 0,
        msgCount: 1,
        charsPerSegment: GSM_CHARS_PER_SEGMENT
    };

    var ucs2CharCount = {
        charCount: 0,
        msgCount: 1,
        charsPerSegment: UCS2_CHARS_PER_SEGMENT
    };

    var gsmPartCharRem = GSM_CHARS_PER_SEGMENT;
    var gsmTotCharCount = 0;
    var ucs2PartCharRem = UCS2_CHARS_PER_SEGMENT;
    var ucs2TotCharCount = 0;

    var isGsmEncoding = true;

    var textLen = text.length;
    for (var i = 0; i < textLen; i++) {
        var c = text[i];
        var _isGsmChar = GSM_ALPHABET.indexOf(c) !== -1;
        var isExtGsmChar = GSM_ALPHABET_EXTENDED.indexOf(c) !== -1;

        // Default to normal character sizes
        var gsmCharSize = 1;
        var ucs2CharSize = 1;

        if (_isGsmChar || isExtGsmChar) {
            if (isExtGsmChar) {
                // Extended gsm characters uses 2 character slots.
                // Special care is needed to not split a message
                // so that the 2 characters end up in separate segments.
                gsmCharSize = 2;
            }

            // No characters in the GSM alphabet require any special handling for UCS2.
        } else {
            // Text is not valid gsm encoding
            isGsmEncoding = false;

            // Check to see if we've got a surrogate pair.
            // Special care is needed to not split a message
            // so that the pair end up in separate segments.
            var charCode = text.charCodeAt(i);
            if (isHighSurrogateCode(charCode) && isLowSurrogateCode(text.charCodeAt(i + 1))) {
                ucs2CharSize = 2;
            } else if (isLowSurrogateCode(charCode) && isHighSurrogateCode(text.charCodeAt(i - 1))) {
                ucs2CharSize = 0;
            }

            // Characters not in the GSM alphabet is assumed to be replaced
            // by ? (question mark) or similar.
        }

        if (gsmCharSize != 0) {
            gsmTotCharCount += gsmCharSize;

            // If character does not fit inside current segment, add a new segment.
            // The charCount is initialized to the maximum number of characters for
            // the number of segments, we do not return information about the number
            // of unused "padding" characters we add to keep the extended characters
            // in the same segment.
            if (gsmPartCharRem < gsmCharSize) {
                gsmCharCount.charCount = gsmCharCount.msgCount * GSM_CHARS_PER_SEGMENT;
                gsmCharCount.msgCount++;
                gsmPartCharRem = GSM_CHARS_PER_SEGMENT;
            }

            gsmPartCharRem -= gsmCharSize;
            gsmCharCount.charCount += gsmCharSize;
        }

        if (ucs2CharSize != 0) {
            ucs2TotCharCount += ucs2CharSize;

            // If character does not fit inside current segment, add a new segment.
            // The charCount is initialized to the maximum number of characters for
            // the number of segments, we do not return information about the number
            // of unused "padding" characters we add to keep the surrogate pairs
            // in the same segment.
            if (ucs2PartCharRem < ucs2CharSize) {
                ucs2CharCount.charCount = ucs2CharCount.msgCount * UCS2_CHARS_PER_SEGMENT;
                ucs2CharCount.msgCount++;
                ucs2PartCharRem = UCS2_CHARS_PER_SEGMENT;
            }

            ucs2PartCharRem -= ucs2CharSize;
            ucs2CharCount.charCount += ucs2CharSize;
        }
    }

    // If the total number of characters in the text fit inside 
    // a single part message, we fix the returned values for 
    // both GSM and UCS2 here.
    if (gsmTotCharCount <= GSM_CHARS_SINGLE_SEGMENT) {
        gsmCharCount.charCount = gsmTotCharCount;
        gsmCharCount.msgCount = 1;
        gsmCharCount.charsPerSegment = GSM_CHARS_SINGLE_SEGMENT;
    }

    if (ucs2TotCharCount <= UCS2_CHARS_SINGLE_SEGMENT) {
        ucs2CharCount.charCount = ucs2TotCharCount;
        ucs2CharCount.msgCount = 1;
        ucs2CharCount.charsPerSegment = UCS2_CHARS_SINGLE_SEGMENT;
    }

    return {
        isGsmEncoding: isGsmEncoding, gsmCharCount: gsmCharCount, ucs2CharCount: ucs2CharCount
    };
}

/**
 * Returns an object with the following values:
 * - charCount: <number>        // number of characters in input text
 * - msgCount: <number>         // number of sms message parts needed for the input text
 * - charPerSegment: <number>   // number of characters that will fit inside each message part
 * - encoding: <'GSM'/'UCS2'>   // the encoding required for the input text, any non-gsm text will use UCS2
 */
function getCharCount(text) {
    var ret = getCharCountInfo(text);
    if (ret.isGsmEncoding) {
        ret.gsmCharCount.encoding = 'GSM';
        return ret.gsmCharCount;
    } else {
        ret.ucs2CharCount.encoding = 'UCS2';
        return ret.ucs2CharCount;
    }
}

function isGsmChar(c) {
    return GSM_ALPHABET.indexOf(c) !== -1 || GSM_ALPHABET_EXTENDED.indexOf(c) !== -1;
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
    if (typeof msgText !== 'string' && !(msgText instanceof String)) {
        return '';
    }

    msgText = msgText.replace(/[\u2018\u2019\u201A`]/g, "\'").replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, "\"").replace(/\u2026/g, "...").replace(/[\u2013\u2014]/g, "-");

    return msgText.split('').map(function (c) {
        return !isGsmChar(c) ? '?' : c;
    }).join('');
}

exports.getCharCount = getCharCount;
exports.isGsmChar = isGsmChar;
exports.removeNonGsmChars = removeNonGsmChars;