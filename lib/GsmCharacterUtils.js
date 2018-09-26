'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var SMS_BYTES = 140;
var SMS_CONCAT_UDH_BYTES = 6;
var SMS_CONCAT_UD_BYTES = SMS_BYTES - SMS_CONCAT_UDH_BYTES;

var GSM_ALPHABET_EXTENDED = '\f^{}\\[~]|\u20AC';

var GSM_ALPHABET = '@\xA3$\xA5\xE8\xE9\xF9\xEC\xF2\xE7\n\xD8\xF8\r\xC5\xE5\u0394_\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\xA0\xC6\xE6\xDF' + '\xC9 !"#\xA4%&\'()*+,-./0123456789:;<=' + '>?\xA1ABCDEFGHIJKLMNOPQRSTUVWXYZ\xC4\xD6' + '\xD1\xDC\xA7\xBFabcdefghijklmnopqrstuvwxyz\xE4' + '\xF6\xF1\xFC\xE0';

/**
 * Returns an object with the following values:
 * - charCount: <number>        // number of characters in input text
 * - msgCount: <number>         // number of sms message parts needed for the input text
 * - charPerSegment: <number>   // number of characters that will fit inside each message part
 * - encoding: <'GSM'/'UCS2'>   // the encoding required for the input text, any non-gsm text will use UCS2
 */
function getCharCount(text) {
    var textLen = text.length;

    var tmpCharCount = 0;
    var totCharCount = 0;
    var totPadCount = 0; // Total number of characters we've had to skip at the end of a segment because the next character was an extended char

    // Start off assuming GSM encoding with multiple segments
    var ret = { charCount: textLen, msgCount: 1, charsPerSegment: Math.floor(SMS_CONCAT_UD_BYTES * 8 / 7), encoding: 'GSM' };

    // Start processing the text as concattenated GSM alphabet, we will correct for text that fit in 1 message after text is processed
    for (var i = 0; i < textLen; i++) {
        var c = text[i];
        if (GSM_ALPHABET.indexOf(c) !== -1) {
            if (tmpCharCount >= ret.charsPerSegment) {
                ret.msgCount++;
                tmpCharCount = 0;
            }
            tmpCharCount++;
            totCharCount++;
        } else if (GSM_ALPHABET_EXTENDED.indexOf(c) !== -1) {
            // Do not split message on gsm escape sequence
            if (tmpCharCount >= ret.charsPerSegment - 1) {
                if (tmpCharCount === ret.charsPerSegment - 1) {
                    totPadCount++;
                }

                ret.msgCount++;
                tmpCharCount = 0;
            }

            tmpCharCount += 2;
            totCharCount += 2;
        } else {
            // Not valid GSM character, fall back to UCS2
            ret.encoding = 'UCS2';

            if (textLen <= Math.floor(SMS_BYTES / 2)) {
                ret.msgCount = 1;
                ret.charsPerSegment = Math.floor(SMS_BYTES / 2);
            } else {
                ret.charsPerSegment = Math.floor(SMS_CONCAT_UD_BYTES / 2);
                ret.msgCount = Math.floor((textLen + (ret.charsPerSegment - 1)) / ret.charsPerSegment);
            }
            break;
        }
    }

    // Correct message count for non-concattenated messages
    if (ret.encoding === 'GSM') {
        // If the total number of characters fit in 1 segment, we don't need to take totPadCount into account
        if (totCharCount <= Math.floor(SMS_BYTES * 8 / 7)) {
            ret.charCount = totCharCount;
            ret.msgCount = 1;
            ret.charsPerSegment = Math.floor(SMS_BYTES * 8 / 7);
        } else {
            ret.charCount = totCharCount + totPadCount;
        }
    }

    return ret;
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