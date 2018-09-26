
const SMS_BYTES = 140;
const SMS_CONCAT_UDH_BYTES = 6;
const SMS_CONCAT_UD_BYTES = SMS_BYTES - SMS_CONCAT_UDH_BYTES;

const GSM_ALPHABET_EXTENDED =
    '\u000c\u005e\u007b\u007d\\\u005b\u007e\u005d\u007c\u20ac';

const GSM_ALPHABET =
    '\u0040\u00A3\u0024\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00E7\n\u00D8\u00F8\r\u00C5\u00E5\u0394\u005F\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00A0\u00C6\u00E6\u00DF' +
    '\u00C9\u0020\u0021\u0022\u0023\u00A4\u0025\u0026\'\u0028\u0029\u002A\u002B\u002C\u002D\u002E\u002F\u0030\u0031\u0032\u0033\u0034\u0035\u0036\u0037\u0038\u0039\u003A\u003B\u003C\u003D' +
    '\u003E\u003F\u00A1\u0041\u0042\u0043\u0044\u0045\u0046\u0047\u0048\u0049\u004A\u004B\u004C\u004D\u004E\u004F\u0050\u0051\u0052\u0053\u0054\u0055\u0056\u0057\u0058\u0059\u005A\u00C4\u00D6' +
    '\u00D1\u00DC\u00A7\u00BF\u0061\u0062\u0063\u0064\u0065\u0066\u0067\u0068\u0069\u006A\u006B\u006C\u006D\u006E\u006F\u0070\u0071\u0072\u0073\u0074\u0075\u0076\u0077\u0078\u0079\u007A\u00E4' +
    '\u00F6\u00F1\u00FC\u00E0';

/**
 * Returns an object with the following values:
 * - charCount: <number>        // number of characters in input text
 * - msgCount: <number>         // number of sms message parts needed for the input text
 * - charPerSegment: <number>   // number of characters that will fit inside each message part
 * - encoding: <'GSM'/'UCS2'>   // the encoding required for the input text, any non-gsm text will use UCS2
 */
function getCharCount(text) {
    const textLen = text.length;

    let tmpCharCount = 0;
    let totCharCount = 0;
    let totPadCount = 0;    // Total number of characters we've had to skip at the end of a segment because the next character was an extended char

    // Start off assuming GSM encoding with multiple segments
    let ret = { charCount: textLen, msgCount: 1, charsPerSegment: Math.floor((SMS_CONCAT_UD_BYTES * 8) / 7), encoding: 'GSM' };

    // Start processing the text as concattenated GSM alphabet, we will correct for text that fit in 1 message after text is processed
    for (let i = 0; i < textLen; i++) {
        let c = text[i];
        if (GSM_ALPHABET.indexOf(c) !== -1) {
            if (tmpCharCount >= ret.charsPerSegment) {
                ret.msgCount++;
                tmpCharCount = 0;
            }
            tmpCharCount++;
            totCharCount++;
        } else if (GSM_ALPHABET_EXTENDED.indexOf(c) !== -1) {
            // Do not split message on gsm escape sequence
            if (tmpCharCount >= (ret.charsPerSegment - 1)) {
                if (tmpCharCount === (ret.charsPerSegment - 1)) {
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
        if (totCharCount <= Math.floor((SMS_BYTES * 8) / 7)) {
            ret.charCount = totCharCount;
            ret.msgCount = 1;
            ret.charsPerSegment = Math.floor((SMS_BYTES * 8) / 7);
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
    if(typeof msgText !== 'string' && !(msgText instanceof String)) {
        return '';
    }

    msgText = msgText
        .replace(/[\u2018\u2019\u201A`]/g, "\'")
        .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, "\"")
        .replace(/\u2026/g, "...")
        .replace(/[\u2013\u2014]/g, "-")
        ;

    return msgText.split('')
        .map(c => !isGsmChar(c) ? '?' : c)
        .join('');
}

export { getCharCount, isGsmChar, removeNonGsmChars };