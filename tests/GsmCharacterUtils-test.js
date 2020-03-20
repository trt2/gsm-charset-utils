import { assert, expect } from 'chai';

import * as GsmCharacterUtils from '../src/GsmCharacterUtils'; 

let getCharCountTests = [
    // 140bytes per segment.
    // GSM encoding: 160 chars in 1 message, 153 chars in each segment
    // UCS2 encoding: 70 chars in 1 message, 67 chars in each segment
    { 'name': 'g000 - empty text',                          'text': '', 'expected': { msgCount: 1, charCount: 0, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g001 - short text',                          'text': 'asd', 'expected': { msgCount: 1, charCount: 3, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g002 - extended char single segment',        'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][]', 'expected': { msgCount: 1, charCount: 160, charsPerSegment: 160, encoding: 'GSM' } },
    { 'name': 'g003 - extended char multiple segments',     'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][', 'expected': { msgCount: 2, charCount: 163, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g004 - 153 char text',                       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 1, charCount: 153, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g005 - 154 char text ext char ending',       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa{', 'expected': { msgCount: 1, charCount: 154, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g006 - 1 part with ext char on 153',         'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbb', 'expected': { msgCount: 1, charCount: 160, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g007 - 2 part with ext char on 153 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbbc', 'expected': { msgCount: 2, charCount: 162, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g008 - max 2 part length',                   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 2, charCount: 306, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g009 - 3 part with ext char on 306 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g010 - 307 char text',                       'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1b', 'expected': { msgCount: 3, charCount: 307, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g011 - 3 part with ext char on 307 (no pad)','text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1[', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },

    { 'name': 'g012 - 3 part with ext char on 153 (pad)',   'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },

    { 'name': 'u001 - single ucs2 char',                    'text': '`', 'expected': { msgCount: 1, charCount: 1, charsPerSegment: 70, encoding: 'UCS2'} },
    { 'name': 'u002 - 70 char text',                        'text': '`123456789012345678901234567890123456789012345678901234567890123456789', 'expected': { msgCount: 1, charCount: 70, charsPerSegment: 70, encoding: 'UCS2'} },
    { 'name': 'u003 - 71 char text',                        'text': '`1234567890123456789012345678901234567890123456789012345678901234567890', 'expected': { msgCount: 2, charCount: 71, charsPerSegment: 67, encoding: 'UCS2'} },
    { 'name': 'u004 - 134 char text',                       'text': '`123456789012345678901234567890123456789012345678901234567890123456`123456789012345678901234567890123456789012345678901234567890123456', 'expected': { msgCount: 2, charCount: 134, charsPerSegment: 67, encoding: 'UCS2'} },
    { 'name': 'u005 - 135 char text',                       'text': '`123456789012345678901234567890123456789012345678901234567890123456`1234567890123456789012345678901234567890123456789012345678901234567', 'expected': { msgCount: 3, charCount: 135, charsPerSegment: 67, encoding: 'UCS2'} },
    
    { 'name': 'u007 - single emoji',                        'text': '\uD83D\uDE00', 'expected': { msgCount: 1, charCount: 2, charsPerSegment: 70, encoding: 'UCS2'} },
    
    // u008:
    // Split message on surrogate pair, this will add 1 padding character to segment 1
    // [66 + 1p], [2c + 10]
    // 67 + 12 = 79
    { 'name': 'u008 - single emoji (pad)',                  'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\uD83D\uDE00aaaaaaaaaa', 'expected': { msgCount: 2, charCount: 79, charsPerSegment: 67, encoding: 'UCS2'} },
    
    // u009: test 1. part ends with an emoji that is split between messages, this cannot happen, so we have to move the entire surrogate pair to part 2
    // We will add a "padding character" to the count in order to "fill" the segment.
    // The part 2 message also ends with a surrogate pair that must be moved to part3
    // If this text is just split at 67 characters, we would end up with 2 parts
    // 66 characters, surrogate pair, 64 characters, surrogate pair
    // [66c + 1p],  [2c + 64c + 1p], [2c]
    //  67 + 67 + 2 = 136
    { 'name': 'u009 - surrogate pair padding',              'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uD83D\uDE00', 'expected': { msgCount: 3, charCount: 136, charsPerSegment: 67, encoding: 'UCS2'} },

    // u010: (invalid surrogate pair, missing low)
    // [66c + 1p],  [2c + 65c]
    //  67 + 67 + 2 = 136
    { 'name': 'u010 - missing low surrogate',               'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uD83D', 'expected': { msgCount: 2, charCount: 134, charsPerSegment: 67, encoding: 'UCS2'} },

    // u011: (invalid surrogate pair, missing low)
    // [66c + 1p],  [2c + 65c]
    //  67 + 67 + 2 = 136
    { 'name': 'u011 - missing high surrogate',              'text': '`12345678901234567890123456789012345678901234567890123456789012345\uD83D\uDE00`123456789012345678901234567890123456789012345678901234567890123\uDE00', 'expected': { msgCount: 2, charCount: 134, charsPerSegment: 67, encoding: 'UCS2'} },
];

describe("getCharCount test", function() {
    getCharCountTests.forEach((item) => {
        it(item.name, function() {
            let res = GsmCharacterUtils.getCharCount(item.text);
            expect(res).to.eql(item.expected);
        });
    });
});

describe("removeNonGsmChars test", function() {
    describe("simple tests", function() {    
        it('No change', function() {
            const text = 'test€ test æøå {}[] asd $';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(text);
        });

        it('Remove ucs2 char', function() {
            const text = 'test`asd';
            const expected = 'test\'asd';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Replace quote chars', function() {
            const text = 'test «asd» “123” ‘single’ `back` lalalala ';
            const expected = 'test "asd" "123" \'single\' \'back\' lalalala ';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Replace ellipsis char', function() {
            const text = 'test…';
            const expected = 'test...';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Replace hyphen chars', function() {
            const text = 'test – asd — asd2';
            const expected = 'test - asd - asd2';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Replace chars with ?', function() {
            const text = 'test © lala ™ asd 🙃 asd2 👨‍✈️';
            const expected = 'test ? lala ? asd ?? asd2 ?????';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        });

        it('Replace chars with *', function() {
            const text = 'test © lala ™ asd 🙃 asd2 👨‍✈️';
            const expected = 'test * lala * asd ** asd2 *****';
            let res = GsmCharacterUtils.removeNonGsmChars(text, '*');
            expect(res).to.equal(expected);
        });        
    });
});
