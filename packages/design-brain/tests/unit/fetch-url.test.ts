import { describe, expect, it } from 'vitest';
import { fetchUrlText } from '../../src/research/fetch-url';

describe('research URL safety', () => {
  it.each([
    'http://localhost/internal',
    'http://127.0.0.1/internal',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.1/private',
    'http://[::1]/private',
  ])('rejects private target %s', async (url) => {
    await expect(fetchUrlText(url)).rejects.toThrow(
      /Local network|Private or non-routable/,
    );
  });

  it('rejects credentials embedded in a URL', async () => {
    await expect(fetchUrlText('https://user:pass@example.com')).rejects.toThrow(
      'credentials',
    );
  });
});
