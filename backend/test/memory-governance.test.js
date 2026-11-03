import test from 'node:test';
import assert from 'node:assert/strict';
import { extractExplicitMemoryCandidate, memoryContentHash, memoryExpiryFromDays, normalizeMemoryContent, scoreMemoryImportance } from '../src/services/memory-governance.js';

test('only explicit remember/save wording creates a memory proposal', () => {
  assert.equal(extractExplicitMemoryCandidate('Tolong ingat bahwa saya suka jawaban ringkas.'), 'saya suka jawaban ringkas');
  assert.equal(extractExplicitMemoryCandidate('Simpan sebagai memori: proyek saya bernama Nexora.'), 'proyek saya bernama Nexora');
  assert.equal(extractExplicitMemoryCandidate('Halo, apa kabar?'), null);
});

test('sensitive content is not proposed for long-term memory', () => {
  assert.equal(extractExplicitMemoryCandidate('Ingat bahwa diagnosis penyakit saya adalah X.'), null);
  assert.equal(extractExplicitMemoryCandidate('Ingat password akun saya adalah rahasia123.'), null);
});

test('memory normalization and hash are stable across whitespace and case', () => {
  assert.equal(normalizeMemoryContent('  Saya   Suka   Kopi '), 'saya suka kopi');
  assert.equal(memoryContentHash('Saya Suka Kopi'), memoryContentHash(' saya   suka kopi '));
});

test('importance score is bounded and recognizes durable preferences', () => {
  assert.ok(scoreMemoryImportance('Preferensi saya suka jawaban singkat') > 0.5);
  assert.ok(scoreMemoryImportance('x'.repeat(500)) <= 1);
});

test('memory expiry accepts bounded day counts', () => {
  assert.equal(memoryExpiryFromDays(null), null);
  assert.throws(() => memoryExpiryFromDays(0), RangeError);
  assert.throws(() => memoryExpiryFromDays(3651), RangeError);
  assert.ok(Date.parse(memoryExpiryFromDays(30)) > Date.now());
});
