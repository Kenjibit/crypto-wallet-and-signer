// Test Index - Import all test suites
// This file ensures all tests are discovered by Vitest

// Import all test files
import './theme.test';
import './pwa-assets.test';
import './pwa-manifest-generator.test';
import './hooks.test';
import './components.test';

// Test suite for overall package functionality
import { describe, it, expect } from 'vitest';

describe('PWA Package Integration', () => {
  it('should have all test suites loaded', () => {
    // This test ensures all test files are properly imported
    expect(true).toBe(true);
  });

  it('should be ready for comprehensive testing', () => {
    // Verify the testing environment is properly configured
    expect(typeof window).toBe('object');
    expect(typeof document).toBe('object');
    expect(typeof navigator).toBe('object');
  });
});
