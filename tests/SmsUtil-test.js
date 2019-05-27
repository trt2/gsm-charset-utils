import { assert, expect } from 'chai';

import * as SmsUtil from '../src/SmsUtil';

let getCharCountTests = [
    // 140bytes per segment.
    // GSM encoding: 160 chars in 1 message, 153 chars in each segment
    // UCS2 encoding: 70 chars in 1 message, 67 chars in each segment
    { 'name': 'g000 - empty text',                          'text': '', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: '', charCount: 0, byteCount: 0}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 0,
        }
    },
    { 'name': 'g001 - short text',                          'text': 'asd', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'asd', charCount: 3, byteCount: 3}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 3,
        }
    },
    { 'name': 'g002 - extended char single segment',        'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][]', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][]', charCount: 160, byteCount: 140}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 160,
        }    
    },
    { 'name': 'g003 - extended char multiple segments',     'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][]', charCount: 152, byteCount: 133},
                    {text: '[][][', charCount: 10, byteCount: 9}],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 163,
        }
    },    
    { 'name': 'g004 - 153 char text',                       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 153,
        }
    },
    { 'name': 'g005 - 154 char text ext char ending',       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa{', 
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa{', charCount: 154, byteCount: 135}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 154,
        }
    },
    { 'name': 'g006 - 1 part with ext char on 153',         'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbb',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbb', charCount: 160, byteCount: 140}
                ],
                bytesPerSegment: 140,
                charsPerSegment: 160
            },
            paddedCharCount: 160,
        }
    },
    { 'name': 'g007 - 2 part with ext char on 153 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbbc',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', charCount: 152, byteCount: 133},
                    {text: '[bbbbbbc', charCount: 9, byteCount: 8}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 162,
        }
    },
    { 'name': 'g008 - max 2 part length',                   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 306,
        }
    },
    { 'name': 'g009 - 3 part with ext char on 306 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', charCount: 152, byteCount: 133},
                    {text: '[', charCount: 2, byteCount: 2}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 308,
        }
    },
    { 'name': 'g010 - 307 char text',                       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1b',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: 'b', charCount: 1, byteCount: 1}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 307,
        }
    },
    { 'name': 'g011 - 3 part with ext char on 307 (no pad)','text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1[',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', charCount: 153, byteCount: 134},
                    {text: '[', charCount: 2, byteCount: 2}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 308
        }
    },
    { 'name': 'g012 - 3 part with ext char on 153 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1',
        'expected': { 
            segmentInfo: {
                encoding: 'GSM',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', charCount: 152, byteCount: 133},
                    {text: '[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', charCount: 153, byteCount: 134},
                    {text: 'a1', charCount: 2, byteCount: 2}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 153
            },
            paddedCharCount: 308
        }
    },

    { 'name': 'u001 - single ucs2 char',                    'text': '`',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`', charCount: 1, byteCount: 2},
                ],
                bytesPerSegment: 140,
                charsPerSegment: 70
            },
            paddedCharCount: 1
        }
    },
    { 'name': 'u002 - 70 char text',                        'text': '`123456789012345678901234567890123456789012345678901234567890123456789',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456789', charCount: 70, byteCount: 140},
                ],
                bytesPerSegment: 140,
                charsPerSegment: 70
            },
            paddedCharCount: 70
        }
    },
    { 'name': 'u003 - 71 char text',                        'text': '`1234567890123456789012345678901234567890123456789012345678901234567890',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456', charCount: 67, byteCount: 134},
                    {text: '7890', charCount: 4, byteCount: 8},
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 71
        }
    },
    { 'name': 'u004 - 134 char text',                       'text': '`123456789012345678901234567890123456789012345678901234567890123456`123456789012345678901234567890123456789012345678901234567890123456',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456', charCount: 67, byteCount: 134},
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456', charCount: 67, byteCount: 134},
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 134
        }
    },
    { 'name': 'u005 - 135 char text',                       'text': '`123456789012345678901234567890123456789012345678901234567890123456`1234567890123456789012345678901234567890123456789012345678901234567',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456', charCount: 67, byteCount: 134},
                    {text: '`123456789012345678901234567890123456789012345678901234567890123456', charCount: 67, byteCount: 134},
                    {text: '7', charCount: 1, byteCount: 2},
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 135
        }
    },
    
    { 'name': 'u007 - single emoji',                        'text': '\uD83D\uDE00',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '\uD83D\uDE00', charCount: 2, byteCount: 4},
                ],
                bytesPerSegment: 140,
                charsPerSegment: 70
            },
            paddedCharCount: 2
        }
    },
    
    // u008:
    // Split message on surrogate pair, this will add 1 padding character to segment 1
    // [66 + 1p], [2c + 10]
    // 67 + 12 = 79
    { 'name': 'u008 - single emoji (pad)',                  'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\uD83D\uDE00aaaaaaaaaa',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', charCount: 66, byteCount: 132},
                    {text: '\uD83D\uDE00aaaaaaaaaa', charCount: 12, byteCount: 24}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 79
        }
    },
    
    // u009: test 1. part ends with an emoji that is split between messages, this cannot happen, so we have to move the entire surrogate pair to part 2
    // We will add a "padding character" to the count in order to "fill" the segment.
    // The part 2 message also ends with a surrogate pair that must be moved to part3
    // If this text is just split at 67 characters, we would end up with 2 parts
    // 66 characters, surrogate pair, 64 characters, surrogate pair
    // [66c + 1p],  [2c + 64c + 1p], [2c]
    //  67 + 67 + 2 = 136
    { 'name': 'u009 - surrogate pair padding',              'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uD83D\uDE00',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`12345678901234567890123456789012345678901234567890123456789012345', charCount: 66, byteCount: 132},
                    {text: '\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123', charCount: 66, byteCount: 132},
                    {text: '\uD83D\uDE00', charCount: 2, byteCount: 4}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 136
        }
    },

    // u010: (invalid surrogate pair, missing low)
    // [66c + 1p],  [2c + 65c]
    //  67 + 67 + 2 = 136
    { 'name': 'u010 - missing low surrogate',               'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uD83D',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`12345678901234567890123456789012345678901234567890123456789012345', charCount: 66, byteCount: 132},
                    {text: '\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uD83D', charCount: 67, byteCount: 134}
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 134
        }
    },

    // u011: (invalid surrogate pair, missing low)
    // [66c + 1p],  [2c + 65c]
    //  67 + 67 + 2 = 136
    { 'name': 'u011 - missing high surrogate',              'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uDE00',
        'expected': { 
            segmentInfo: {
                encoding: 'UCS2',
                parts: [
                    {text: '`12345678901234567890123456789012345678901234567890123456789012345', charCount: 66, byteCount: 132},
                    {text: '\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uDE00', charCount: 67, byteCount: 134},
                ],
                bytesPerSegment: 134,
                charsPerSegment: 67
            },
            paddedCharCount: 134
        }
    }
];

describe("splitStringIntoSmsSegments test", function() {
    getCharCountTests.forEach((item) => {
        it(item.name, function() {
            let splitRes = SmsUtil.splitStringIntoSmsSegments(item.text);
            expect(splitRes).to.eql(item.expected);
        });
    });
});

describe("getSmsCharCountInfo test", function() {
    getCharCountTests.forEach((item) => {
        it(item.name, function() {
            let charCountInfo = SmsUtil.getSmsCharCountInfo(item.text);
            expect(charCountInfo.isGsmEncoding).to.eql(item.expected.segmentInfo.encoding === 'GSM');
            if(charCountInfo.isGsmEncoding) {
                expect(charCountInfo.gsmCharCount.charCount).to.eql(item.expected.paddedCharCount);
                expect(charCountInfo.gsmCharCount.msgCount).to.eql(item.expected.segmentInfo.parts.length);
                expect(charCountInfo.gsmCharCount.charsPerSegment).to.eql(item.expected.segmentInfo.charsPerSegment);
            } else {
                expect(charCountInfo.ucs2CharCount.charCount).to.eql(item.expected.paddedCharCount);
                expect(charCountInfo.ucs2CharCount.msgCount).to.eql(item.expected.segmentInfo.parts.length);
                expect(charCountInfo.ucs2CharCount.charsPerSegment).to.eql(item.expected.segmentInfo.charsPerSegment);
            }
        });
    });
});


describe("removeNonGsmChars test", function() {
    describe("simple tests", function() {    
        it('No change', function() {
            const text = 'test€ test æøå {}[] asd $';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(text);
        });

        it('Remove ucs2 char', function() {
            const text = 'test`asd';
            const expected = 'test?asd';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Remove quote chars', function() {
            const text = 'test «asd» “123” ‘single’ `back` lalalala ';
            const expected = 'test ?asd? ?123? ?single? ?back? lalalala ';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Remove ellipsis char', function() {
            const text = 'test…';
            const expected = 'test?';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Remove hyphen chars', function() {
            const text = 'test – asd — asd2';
            const expected = 'test ? asd ? asd2';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Remove chars with ?', function() {
            const text = 'test © lala ™ asd 🙃 asd2 👨‍✈️';
            const expected = 'test ? lala ? asd ?? asd2 ?????';
            let res = SmsUtil.replaceNonGsmChars(text);
            expect(res).to.equal(expected);
        });
    });
});
