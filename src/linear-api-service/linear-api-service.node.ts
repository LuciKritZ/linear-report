/**
 * Unit tests for Linear API service
 */

import { describe, it, expect } from 'vitest';
import { createLinearClient } from './linear-api-service.utils.js';

describe('createLinearClient', () => {
  it('returns a LinearClient instance', () => {
    const client = createLinearClient('lin_api_test_key_placeholder');
    expect(client).toBeDefined();
    expect(typeof client.viewer).toBe('object');
  });
});
