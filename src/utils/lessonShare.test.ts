import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailHref, lessonShareUrl, whatsAppHref } from './lessonShare.ts';

test('a share link is the canonical address plus fixed campaign parameters', () => {
  assert.equal(
    lessonShareUrl('liquidity', 'copy'),
    'https://nidhi.today/blog/liquidity/?utm_source=share&utm_medium=referral&utm_campaign=lesson_share&utm_content=copy',
  );
});

test('the WhatsApp link carries the title and its own tagged address, encoded', () => {
  const text = new URL(whatsAppHref('liquidity', 'Cash & Liquidity')).searchParams.get('text');
  assert.equal(text, `Cash & Liquidity ${lessonShareUrl('liquidity', 'whatsapp')}`);
});

test('the email link carries the title as subject and the tagged address as body', () => {
  const href = emailHref('liquidity', 'Cash & Liquidity');
  assert.ok(href.startsWith('mailto:?subject=Cash%20%26%20Liquidity&body='));
  assert.equal(decodeURIComponent(href.split('&body=')[1]), lessonShareUrl('liquidity', 'email'));
});
