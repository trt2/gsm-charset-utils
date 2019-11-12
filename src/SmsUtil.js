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
 * Check if c is a gsm character
 * 
 * @param {*} c 
 */
function isStdGsmChar(c) {
    return !!GSM_ALPHABET_MAP[c];
}

/**
 * Check if c is an extended gsm character
 * 
 * @param {*} c 
 */
function isExtGsmChar(c) {
    return !!GSM_ALPHABET_EXTENDED_MAP[c];
}

/**
 * Check if c is either a gsm character or an extended gsm character
 * @param {*} c 
 */
function isGsmChar(c) {
    return isStdGsmChar(c) || isExtGsmChar(c);
}

/**
 * Check if string only contains valid gsm or extended gsm characters
 * 
 * @param {*} text 
 */
function isGsmString(text) {
    for(let i=0;i<text.length;i++) {
        if(!isGsmChar(text[i])) {
            return false;
        }
    }

    return true;
}

/**
 * Get the number of extended gsm characters in string.
 * This can be added to the length of string to determine how
 * many character slots it will occupy.
 * 
 * @param {*} str 
 */
function getGsmExtendedCharCount(str) {
    let extCharCnt = 0;
    for(let i=0;i<str.length;i++) {
        extCharCnt += isExtGsmChar(str[i]) ? 1 : 0;
    }
    
    return extCharCnt;
}

/**
 * Calculate the number of bytes required for a gsm alphabet string of charCount characters.
 * Note that the number of escape characters for extended characters must be included in charCount.
 * 
 * @param {*} charCount 
 */
function getByteLengthFromGsmCharCount(charCount) {
    return Math.ceil((charCount * 7) / 8);
}

/**
 * Calculate the number of bytes required for the string when using gsm charset,
 * this takes into account extended characters.
 * 
 * @param {*} str 
 */
function getStringLengthBytesGsm(str) {
    return getByteLengthFromGsmCharCount(str.length + getGsmExtendedCharCount(str));
}

/**
 * Calculate the number of characters that will fit in byteCount bytes when using gsm charset.
 * 
 * @param {*} byteCount 
 */
function getCharCountForByteCountGsm(byteCount) {
    return Math.floor((byteCount * 8) / 7);
}

/**
 * Calculate the number of bytes required for the string when using UTF-16 encoding.
 * @param {*} str 
 */
function getStringLengthBytesUtf16(str) {
    return str.length * 2;
}

/**
 * Replace all non-gsm characters in the string with replacementChar.
 * 
 * @param {*} str 
 * @param {*} replacementChar 
 */
function replaceNonGsmChars(str, replacementChar='?') {
    return str.split('')
        .map(c => !isGsmChar(c) ? replacementChar : c)
        .join('');
} 

/**
 * Create object for a split message part
 */
function createSegmentInfo() {
    return {
        text: '',
        charCount: 0,
        byteCount: 0
    };
}

/**
 * Create the object returned by the split functions
 * 
 * @param {*} encoding 
 * @param {*} parts 
 * @param {*} bytesPerSegment 
 * @param {*} charsPerSegment 
 */
function createSplitResult(encoding, parts, bytesPerSegment, charsPerSegment) {
    return {
        encoding,
        parts,
        bytesPerSegment,
        charsPerSegment
    };
}

/**
 * Split a string, using gsm alphabet, into parts that will at most be bytesPerSegment number of bytes long.
 * 
 * @param {*} str 
 * @param {*} bytesPerSegment 
 */
function splitStringToGsmSegments(str, bytesPerSegment) {
    if(bytesPerSegment <= 2) {
        bytesPerSegment = 2;
    }

    let parts = [];
    let nextStrPos = 0;
    const charsPerSegment = getCharCountForByteCountGsm(bytesPerSegment);
    
    let curPartRemCharCount = charsPerSegment;
    let strLen = str.length;
    
    let curSegment = createSegmentInfo();
    let curSegmentHasInvalidChar = false;

    for(let strPos=0;strPos<strLen;strPos++) {
        const c = str[strPos];
        let charSize = 1;
        if(isExtGsmChar(c)) {
            charSize = 2;
        } else {
            // This should not happen as the str should only contain valid gsm characters, 
            // but if it does, we replace all non-gsm characters with ?
            curSegmentHasInvalidChar = !isStdGsmChar(c);
        }        

        if(curPartRemCharCount < charSize) {
            curSegment.text = str.substring(nextStrPos, strPos);
            if(curSegmentHasInvalidChar) {
                curSegment.text = replaceNonGsmChars(curSegment.text);
            }

            curSegment.byteCount = getByteLengthFromGsmCharCount(charsPerSegment - curPartRemCharCount);
            parts.push(curSegment);
            nextStrPos = strPos;
            curPartRemCharCount = charsPerSegment;
            curSegment = createSegmentInfo();
            curSegmentHasInvalidChar = false;
        }

        curSegment.charCount += charSize;
        curPartRemCharCount -= charSize;
    }

    if(curPartRemCharCount < charsPerSegment) {
        curSegment.text = str.substring(nextStrPos);
        if(curSegmentHasInvalidChar) {
            curSegment.text = replaceNonGsmChars(curSegment.text);
        }
        curSegment.byteCount = getByteLengthFromGsmCharCount(charsPerSegment - curPartRemCharCount);
        parts.push(curSegment);
    }

    return createSplitResult('GSM', parts, bytesPerSegment, charsPerSegment);
}

/**
 * Create a splitResult for a single part gsm charset message
 * 
 * @param {*} str 
 */
function getSinglePartSegmentInfoGsm(str) {
    let curSegment = createSegmentInfo();
    curSegment.text = str;
    curSegment.charCount = str.length + getGsmExtendedCharCount(str);
    curSegment.byteCount = getByteLengthFromGsmCharCount(curSegment.charCount);
    
    return createSplitResult('GSM', [curSegment], SMS_BYTES, GSM_CHARS_SINGLE_SEGMENT);
}

/**
 * Split a string, using UTF-16 encoding, into parts that will at most be bytesPerSegment number of bytes long.

 * @param {*} str 
 * @param {*} bytesPerSegment 
 */
function splitStringToUtf16Segments(str, bytesPerSegment) {
    if(bytesPerSegment <= 4) {
        bytesPerSegment = 4;
    }

    let parts = [];
    let nextStrPos = 0;
    let curPartRemByteLen = bytesPerSegment;
    let strLen = str.length;
    
    let curSegment = createSegmentInfo();

    for(let strPos=0;strPos<strLen;strPos++) {
        let charByteSize = 2;
        if(isHighSurrogateCode(str.charCodeAt(strPos))) {
            if((strPos+1 < strLen) && isLowSurrogateCode(str.charCodeAt(strPos+1))) {
                charByteSize = 4;
            }
        }

        if(curPartRemByteLen < charByteSize) {
            curSegment.text = str.substring(nextStrPos, strPos);
            curSegment.charCount = curSegment.text.length;
            curSegment.byteCount = curSegment.text.length*2;
            parts.push(curSegment);
            nextStrPos = strPos;
            curPartRemByteLen = bytesPerSegment;
            curSegment = createSegmentInfo();
        }

        if(charByteSize == 4) {
            strPos++;
        }

        curPartRemByteLen -= charByteSize;
    }

    if(curPartRemByteLen < bytesPerSegment) {
        curSegment.text = str.substring(nextStrPos);
        curSegment.charCount = curSegment.text.length;
        curSegment.byteCount = curSegment.text.length*2;
        parts.push(curSegment);
    }

    return createSplitResult('UCS2', parts, bytesPerSegment, Math.floor(bytesPerSegment/2));
}

/**
 * Create a splitResult for a single part UTF-16 encoded message
 * 
 * @param {*} str 
 */
function getSinglePartSegmentInfoUtf16(str) {
    let curSegment = createSegmentInfo();
    curSegment.text = str;
    curSegment.charCount = str.length;
    curSegment.byteCount = curSegment.charCount * 2;

    return createSplitResult('UCS2', [curSegment], SMS_BYTES, Math.floor(SMS_BYTES/2));
}

/**
 * Returns an array where each entry contains the character in the string and how many
 * character slots it will occupy in a message when using the gsm 7bit character set.
 * 
 * @param {*} str 
 */
function getSmsCharSizeInfoGsm(str) {
    return str.split('').map((c) => ({
        c,
        slots: isExtGsmChar(c) ? 2 : 1
    }));
}

/**
 * Returns an array where each entry contains the character in the string and how
 * many character slots it will occupy in the message when using UTF-16.
 * Surrogate pairs are combined into a single entry.
 * 
 * @param {*} str 
 */
function getSmsCharSizeInfoUtf16(str) {
    let ret = [];
    for(let i=0;i<str.length;i++) {
        let c = str[i];
        let slots = 1;
        if(isHighSurrogateCode(str.charCodeAt(i)) && isLowSurrogateCode(str.charCodeAt(i+1))) {
            c += str[i+1];
            slots = 2;
            i++;
        }
        
        ret.push({
            c,
            slots
        });
    }

    return ret;
}

/**
 * Create the value returned by the splitStringIntoSmsSegments* functions.
 * This will simply wrap the result of these methods in an object, and 
 * add a value for the total number of characters in all message segments (paddedCharCount).
 * paddedCharCount will assume that all segments before the last one is filled with the maximum
 * number of characters. This means that if a segment had to be split a character early because
 * of an escape character etc, it will still count as if the segment was full.
 * 
 * @param {*} segmentInfo 
 */
function createSegmentInfoObject(segmentInfo) {
    const msgCount = segmentInfo.parts.length;
    return {
        segmentInfo,
        paddedCharCount: (msgCount-1) * segmentInfo.charsPerSegment + segmentInfo.parts[msgCount-1].charCount    
    };
}

/**
 * Split a string, using gsm alphabet, into multiple parts if it cannot fit within a single SMS message.
 * If the entire string fits inside a single SMS message, no splitting will be done.
 * 
 * @param {*} str 
 */
function splitStringIntoSmsSegmentsGsm(str) {
    if(getStringLengthBytesGsm(str) > SMS_BYTES) {
        return createSegmentInfoObject(splitStringToGsmSegments(str, SMS_CONCAT_UD_BYTES));
    } else {
        return createSegmentInfoObject(getSinglePartSegmentInfoGsm(str));
    }
}

/**
 * Split a string, using UTF-16 encoding, into multiple parts if it cannot fit within a single SMS message.
 * If the entire string fits inside a single SMS message, no splitting will be done.
 * 
 * @param {*} str 
 */
function splitStringIntoSmsSegmentsUtf16(str) {
    if(getStringLengthBytesUtf16(str) > SMS_BYTES) {
        return createSegmentInfoObject(splitStringToUtf16Segments(str, SMS_CONCAT_UD_BYTES));
    } else {
        return createSegmentInfoObject(getSinglePartSegmentInfoUtf16(str));
    }
}

/**
 * If string only contains valid gsm 7bit characters, split the string using splitStringIntoSmsSegmentsGsm()
 * otherwise use splitStringIntoSmsSegmentsUtf16()
 * @param {*} str 
 */
function splitStringIntoSmsSegments(str) {
    if(isGsmString(str)) {
        return splitStringIntoSmsSegmentsGsm(str);
    } else {
        return splitStringIntoSmsSegmentsUtf16(str);
    }
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
function getSmsCharCountInfo(text) {
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
        const isGsmChar = isStdGsmChar(c);
        const isExtChar = !isGsmChar && isExtGsmChar(c);

        // Default to normal character sizes
        let gsmCharSize = 1;
        let ucs2CharSize = 1;

        if(isGsmChar || isExtChar) {
            if(isExtChar) {
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


export {
    //isStdGsmChar,
    //isExtGsmChar,
    isGsmChar,
    //isHighSurrogateCode,
    //isLowSurrogateCode,
    isGsmString,
    replaceNonGsmChars,
    splitStringToGsmSegments,
    splitStringToUtf16Segments,
    getSmsCharSizeInfoGsm,
    getSmsCharSizeInfoUtf16,
    splitStringIntoSmsSegments,
    getSmsCharCountInfo
};