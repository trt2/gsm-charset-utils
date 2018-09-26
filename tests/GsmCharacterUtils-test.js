import { assert, expect } from 'chai';

import * as GsmCharacterUtils from '../src/GsmCharacterUtils'; 

let getCharCountTests = [
    // 140bytes per segment.
    // GSM encoding: 160 chars in 1 message, 153 chars in each segment
    // UCS2 encoding: 70 chars in 1 message, 67 chars in each segment
    { 'name': 'g000', 'text': '', 'expected': { msgCount: 1, charCount: 0, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g001', 'text': 'asd', 'expected': { msgCount: 1, charCount: 3, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g002', 'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][]', 'expected': { msgCount: 1, charCount: 160, charsPerSegment: 160, encoding: 'GSM' } },
    { 'name': 'g003', 'text': '[][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][][', 'expected': { msgCount: 2, charCount: 163, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g004', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 1, charCount: 153, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g005', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa{', 'expected': { msgCount: 1, charCount: 154, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g006', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbb', 'expected': { msgCount: 1, charCount: 160, charsPerSegment: 160, encoding: 'GSM'} },
    { 'name': 'g007', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[bbbbbbc', 'expected': { msgCount: 2, charCount: 162, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g008', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 2, charCount: 306, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g009', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g010', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1b', 'expected': { msgCount: 3, charCount: 307, charsPerSegment: 153, encoding: 'GSM'} },
    { 'name': 'g011', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1[', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },

    { 'name': 'g012', 'text': 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa[aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', 'expected': { msgCount: 3, charCount: 308, charsPerSegment: 153, encoding: 'GSM'} },

    { 'name': 'u001', 'text': '`', 'expected': { msgCount: 1, charCount: 1, charsPerSegment: 70, encoding: 'UCS2'} },
    { 'name': 'u002', 'text': '`123456789012345678901234567890123456789012345678901234567890123456789', 'expected': { msgCount: 1, charCount: 70, charsPerSegment: 70, encoding: 'UCS2'} },
    { 'name': 'u003', 'text': '`1234567890123456789012345678901234567890123456789012345678901234567890', 'expected': { msgCount: 2, charCount: 71, charsPerSegment: 67, encoding: 'UCS2'} },
    { 'name': 'u004', 'text': '`123456789012345678901234567890123456789012345678901234567890123456`123456789012345678901234567890123456789012345678901234567890123456', 'expected': { msgCount: 2, charCount: 134, charsPerSegment: 67, encoding: 'UCS2'} },
    { 'name': 'u005', 'text': '`123456789012345678901234567890123456789012345678901234567890123456`1234567890123456789012345678901234567890123456789012345678901234567', 'expected': { msgCount: 3, charCount: 135, charsPerSegment: 67, encoding: 'UCS2'} },
];

describe("getCharCount test", function() {
    getCharCountTests.forEach((item) => {
        it(item.name, function() {
            let res = GsmCharacterUtils.getCharCount(item.text);
            expect(res).to.eql(item.expected);
        })
    });
});

describe("removeNonGsmChars test", function() {
    describe("simple tests", function() {    
        it('No change', function() {
            const text = 'test€ test æøå {}[] asd $';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(text);
        })

        it('Remove ucs2 char', function() {
            const text = 'test`asd';
            const expected = 'test\'asd';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        })

        it('Replace quote chars', function() {
            const text = 'test «asd» “123” ‘single’ `back` lalalala ';
            const expected = 'test "asd" "123" \'single\' \'back\' lalalala ';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        })

        it('Replace ellipsis char', function() {
            const text = 'test…';
            const expected = 'test...';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        })

        it('Replace hyphen chars', function() {
            const text = 'test – asd — asd2';
            const expected = 'test - asd - asd2';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        })

        it('Replace chars with ?', function() {
            const text = 'test © lala ™ asd 🙃 asd2 👨‍✈️';
            const expected = 'test ? lala ? asd ?? asd2 ?????';
            let res = GsmCharacterUtils.removeNonGsmChars(text);
            expect(res).to.equal(expected);
        })
    });
});
