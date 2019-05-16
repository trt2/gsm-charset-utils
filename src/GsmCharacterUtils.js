
const SMS_BYTES = 140;
const SMS_CONCAT_UDH_BYTES = 6;
const SMS_CONCAT_UD_BYTES = SMS_BYTES - SMS_CONCAT_UDH_BYTES;
const GSM_CHARS_PER_SEGMENT =  Math.floor((SMS_CONCAT_UD_BYTES * 8) / 7);
const UCS2_CHARS_PER_SEGMENT =  Math.floor(SMS_CONCAT_UD_BYTES / 2);

const GSM_CHARS_SINGLE_SEGMENT =  Math.floor((SMS_BYTES * 8) / 7);
const UCS2_CHARS_SINGLE_SEGMENT =  Math.floor(SMS_BYTES / 2);

const GSM_ALPHABET_EXTENDED =
    '\u000c\u005e\u007b\u007d\\\u005b\u007e\u005d\u007c\u20ac';
const GSM_ALPHABET_EXTENDED_MAP = GSM_ALPHABET_EXTENDED.split('').reduce((ret, c) => (ret[c] = c, ret), {});

const GSM_ALPHABET =
    '\u0040\u00A3\u0024\u00A5\u00E8\u00E9\u00F9\u00EC\u00F2\u00E7\n\u00D8\u00F8\r\u00C5\u00E5\u0394\u005F\u03A6\u0393\u039B\u03A9\u03A0\u03A8\u03A3\u0398\u039E\u00A0\u00C6\u00E6\u00DF' +
    '\u00C9\u0020\u0021\u0022\u0023\u00A4\u0025\u0026\'\u0028\u0029\u002A\u002B\u002C\u002D\u002E\u002F\u0030\u0031\u0032\u0033\u0034\u0035\u0036\u0037\u0038\u0039\u003A\u003B\u003C\u003D' +
    '\u003E\u003F\u00A1\u0041\u0042\u0043\u0044\u0045\u0046\u0047\u0048\u0049\u004A\u004B\u004C\u004D\u004E\u004F\u0050\u0051\u0052\u0053\u0054\u0055\u0056\u0057\u0058\u0059\u005A\u00C4\u00D6' +
    '\u00D1\u00DC\u00A7\u00BF\u0061\u0062\u0063\u0064\u0065\u0066\u0067\u0068\u0069\u006A\u006B\u006C\u006D\u006E\u006F\u0070\u0071\u0072\u0073\u0074\u0075\u0076\u0077\u0078\u0079\u007A\u00E4' +
    '\u00F6\u00F1\u00FC\u00E0';
const GSM_ALPHABET_MAP = GSM_ALPHABET.split('').reduce((ret, c) => (ret[c] = c, ret), {});

function isHighSurrogateCode(code) {
    return code >= 0xD800 && code <= 0xDBFF;
}

function isLowSurrogateCode(code) {
    return code >= 0xDC00 && code <= 0xDFFF;
}

/**
 * The function below calculate the number of characters and segments that are needed
 * for the given text. It takes into consideration the extended GSM characters that
 * require an additional escape character, and surrogate pairs for UCS2 characters.
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
    let gsmCharCount = {
        charCount: 0,
        msgCount: 1,
        charsPerSegment: GSM_CHARS_PER_SEGMENT
    };

    let ucs2CharCount = {
        charCount: 0,
        msgCount: 1,
        charsPerSegment: UCS2_CHARS_PER_SEGMENT
    };

    let gsmPartCharRem = GSM_CHARS_PER_SEGMENT;
    let gsmTotCharCount = 0;
    let ucs2PartCharRem = UCS2_CHARS_PER_SEGMENT;
    let ucs2TotCharCount = 0;

    let isGsmEncoding = true;

    const textLen = text.length;
    for (let i=0;i<textLen;i++) {
        const c = text[i];
        const isGsmChar = !!GSM_ALPHABET_MAP[c];
        const isExtGsmChar = !!GSM_ALPHABET_EXTENDED_MAP[c];

        // Default to normal character sizes
        let gsmCharSize = 1;
        let ucs2CharSize = 1;

        if(isGsmChar || isExtGsmChar) {
            if(isExtGsmChar) {
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
            const charCode = text.charCodeAt(i);
            if(isHighSurrogateCode(charCode) && isLowSurrogateCode(text.charCodeAt(i+1))) {
                ucs2CharSize = 2;
            } else if(isLowSurrogateCode(charCode) && isHighSurrogateCode(text.charCodeAt(i-1))) {
                ucs2CharSize = 0;
            }

            // Characters not in the GSM alphabet is assumed to be replaced
            // by ? (question mark) or similar.
        }

        if(gsmCharSize != 0) {
            gsmTotCharCount += gsmCharSize;
            
            // If the character does not fit inside the current segment, add a new segment.
            // The charCount is initialized to the maximum number of characters for
            // the number of segments. We do not return information about the number
            // of unused "padding" characters that are added to keep the extended characters
            // in the same segment.
            if(gsmPartCharRem < gsmCharSize) {
                gsmCharCount.charCount = gsmCharCount.msgCount * GSM_CHARS_PER_SEGMENT;
                gsmCharCount.msgCount++;
                gsmPartCharRem = GSM_CHARS_PER_SEGMENT;
            }

            gsmPartCharRem -= gsmCharSize;
            gsmCharCount.charCount += gsmCharSize;
        }

        if(ucs2CharSize != 0) {
            ucs2TotCharCount += ucs2CharSize;

            // If the character does not fit inside the current segment, add a new segment.
            // The charCount is initialized to the maximum number of characters for
            // the number of segments. We do not return information about the number
            // of unused "padding" characters that are added to keep the surrogate pairs
            // in the same segment.
            if(ucs2PartCharRem < ucs2CharSize) {
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
    if(gsmTotCharCount <= GSM_CHARS_SINGLE_SEGMENT) {
        gsmCharCount.charCount = gsmTotCharCount;
        gsmCharCount.msgCount = 1;
        gsmCharCount.charsPerSegment = GSM_CHARS_SINGLE_SEGMENT;
    }

    if(ucs2TotCharCount <= UCS2_CHARS_SINGLE_SEGMENT) {
        ucs2CharCount.charCount = ucs2TotCharCount;
        ucs2CharCount.msgCount = 1;
        ucs2CharCount.charsPerSegment = UCS2_CHARS_SINGLE_SEGMENT;
    }

    return {
        isGsmEncoding, gsmCharCount, ucs2CharCount
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
    const ret = getCharCountInfo(text);
    if(ret.isGsmEncoding) {
        ret.gsmCharCount.encoding = 'GSM';
        return ret.gsmCharCount;
    } else {
        ret.ucs2CharCount.encoding = 'UCS2';
        return ret.ucs2CharCount;
    }
}

function isGsmChar(c) {
    return !!(GSM_ALPHABET_MAP[c] || GSM_ALPHABET_EXTENDED_MAP[c]);
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