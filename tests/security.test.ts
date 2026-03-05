/**
 * Security APIs Test Suite
 * Tests for Dependabot, Code Scanning, Secret Scanning, Security Advisories, and Security Dashboard APIs
 */

import { AlteriomWebhookClient } from '../src/client';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Security APIs', () => {
  let client: AlteriomWebhookClient;
  let mockHttpInstance: any;

  beforeEach(() => {
    // Create mock HTTP instance with proper structure
    mockHttpInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
          eject: jest.fn(),
        },
        response: {
          use: jest.fn(),
          eject: jest.fn(),
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create = jest.fn().mockReturnValue(mockHttpInstance);

    client = new AlteriomWebhookClient({
      baseURL: 'https://webhook.alteriom.net',
      apiKey: 'test-api-key',
    });
  });

  describe('Security Dashboard API', () => {
    it('should get remediation queue', async () => {
      const mockQueue = [
        {
          id: 'alert-1',
          type: 'dependabot',
          repository: 'Alteriom/webhook-connector',
          alert_number: 123,
          severity: 'critical',
          title: 'Vulnerable package',
          created_at: '2026-03-01T00:00:00Z',
          age_days: 4,
          html_url: 'https://github.com/...',
        },
      ];

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: { data: mockQueue },
      });

      const queue = await client.security.getRemediationQueue(20);

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/security/remediation-queue',
        { params: { limit: 20 } }
      );
      expect(queue).toEqual(mockQueue);
    });

    it('should get repository risk levels', async () => {
      const mockRepos = [
        {
          repository: 'Alteriom/webhook-connector',
          risk_score: 75,
          risk_level: 'high',
          alert_counts: {
            dependabot: 10,
            code_scanning: 5,
            secret_scanning: 2,
          },
          critical_count: 3,
          high_count: 7,
        },
      ];

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: { data: mockRepos },
      });

      const repos = await client.security.getRepositories();

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/security/repositories'
      );
      expect(repos).toEqual(mockRepos);
    });

    it('should get badge counts', async () => {
      const mockBadges = {
        dependabot: {
          total: 100,
          open: 50,
          by_severity: { critical: 10, high: 20, medium: 15, low: 5 },
        },
        code_scanning: {
          total: 80,
          open: 40,
          by_severity: { error: 15, warning: 20, note: 5 },
        },
        secret_scanning: {
          total: 10,
          open: 5,
        },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockBadges,
      });

      const badges = await client.security.getBadgeCounts();

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/security/badge-counts'
      );
      expect(badges).toEqual(mockBadges);
    });
  });

  describe('Dependabot Alerts API', () => {
    it('should list dependabot alerts with filters', async () => {
      const mockResponse = {
        data: [
          {
            id: 'alert-1',
            repository: 'Alteriom/webhook-connector',
            alert_number: 123,
            state: 'open',
            dependency_package: 'axios',
            dependency_ecosystem: 'npm',
            vulnerability_severity: 'critical',
            vulnerability_summary: 'XSS vulnerability',
            vulnerability_ghsa_id: 'GHSA-xxxx-yyyy-zzzz',
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0, count: 1 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const alerts = await client.dependabotAlerts.list({
        repository: 'Alteriom/webhook-connector',
        state: 'open',
        severity: 'critical',
        limit: 50,
        offset: 0,
      });

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/dependabot-alerts',
        {
          params: {
            repository: 'Alteriom/webhook-connector',
            state: 'open',
            severity: 'critical',
            limit: 50,
            offset: 0,
          },
        }
      );
      expect(alerts.data).toEqual(mockResponse.data);
      expect(alerts.total).toBe(1);
    });

    it('should get single dependabot alert', async () => {
      const mockAlert = {
        id: 'alert-1',
        repository: 'Alteriom/webhook-connector',
        alert_number: 123,
        state: 'open',
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockAlert,
      });

      const alert = await client.dependabotAlerts.get('alert-1');

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/dependabot-alerts/alert-1'
      );
      expect(alert).toEqual(mockAlert);
    });

    it('should get alert statistics', async () => {
      const mockStats = {
        total: 100,
        by_state: { open: 50, dismissed: 30, fixed: 20 },
        by_severity: { critical: 10, high: 30, medium: 40, low: 20 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockStats,
      });

      const stats = await client.dependabotAlerts.stats('Alteriom/webhook-connector');

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/dependabot-alerts/stats',
        { params: { repository: 'Alteriom/webhook-connector' } }
      );
      expect(stats).toEqual(mockStats);
    });

    it('should export alerts to CSV', async () => {
      const mockCsv = 'Repository,Package,Severity\nAlteriom/webhook-connector,axios,critical';

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockCsv,
      });

      const csv = await client.dependabotAlerts.export({ state: 'open' });

      expect((client as any).http.get).toHaveBeenCalledWith(
        '/api/v1/dependabot-alerts/export',
        { params: { state: 'open' }, responseType: 'text' }
      );
      expect(csv).toBe(mockCsv);
    });
  });

  describe('Code Scanning Alerts API', () => {
    it('should list code scanning alerts', async () => {
      const mockResponse = {
        data: [
          {
            id: 'alert-1',
            repository: 'Alteriom/webhook-connector',
            alert_number: 456,
            state: 'open',
            rule_id: 'js/sql-injection',
            rule_description: 'SQL injection vulnerability',
            rule_severity: 'error',
            tool_name: 'CodeQL',
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0, count: 1 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const alerts = await client.codeScanningAlerts.list({
        repository: 'Alteriom/webhook-connector',
        state: 'open',
      });

      expect(alerts.data).toEqual(mockResponse.data);
      expect(alerts.total).toBe(1);
    });

    it('should get statistics', async () => {
      const mockStats = {
        total: 50,
        by_state: { open: 30, dismissed: 15, fixed: 5 },
        by_severity: { error: 10, warning: 25, note: 15 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockStats,
      });

      const stats = await client.codeScanningAlerts.stats();

      expect(stats).toEqual(mockStats);
    });
  });

  describe('Secret Scanning Alerts API', () => {
    it('should list secret scanning alerts', async () => {
      const mockResponse = {
        data: [
          {
            id: 'alert-1',
            repository: 'Alteriom/webhook-connector',
            alert_number: 789,
            state: 'open',
            secret_type: 'github_token',
            secret_type_display_name: 'GitHub Personal Access Token',
            locations_count: 2,
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0, count: 1 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const alerts = await client.secretScanningAlerts.list({
        repository: 'Alteriom/webhook-connector',
      });

      expect(alerts.data).toEqual(mockResponse.data);
    });
  });

  describe('Security Advisories API', () => {
    it('should list security advisories', async () => {
      const mockResponse = {
        data: [
          {
            id: 'advisory-1',
            ghsa_id: 'GHSA-xxxx-yyyy-zzzz',
            cve_id: 'CVE-2026-12345',
            summary: 'Critical vulnerability in package',
            severity: 'critical',
            triage_status: 'pending',
          },
        ],
        pagination: { total: 1, limit: 50, offset: 0, count: 1 },
      };

      (client as any).http.get = jest.fn().mockResolvedValue({
        data: mockResponse,
      });

      const advisories = await client.securityAdvisories.list({
        severity: 'critical',
      });

      expect(advisories.data).toEqual(mockResponse.data);
    });

    it('should triage security advisory', async () => {
      const mockAdvisory = {
        id: 'advisory-1',
        ghsa_id: 'GHSA-xxxx-yyyy-zzzz',
        triage_status: 'not_applicable',
        triage_reason: 'Not used in production',
      };

      (client as any).http.post = jest.fn().mockResolvedValue({
        data: mockAdvisory,
      });

      const advisory = await client.securityAdvisories.triage('advisory-1', {
        status: 'not_applicable',
        reason: 'Not used in production',
        notes: 'Dev dependency only',
      });

      expect((client as any).http.post).toHaveBeenCalledWith(
        '/api/v1/security-advisories/advisory-1/triage',
        {
          status: 'not_applicable',
          reason: 'Not used in production',
          notes: 'Dev dependency only',
        }
      );
      expect(advisory).toEqual(mockAdvisory);
    });
  });
});

describe('Repository Management API', () => {
  let client: AlteriomWebhookClient;
  let mockHttpInstance: any;

  beforeEach(() => {
    mockHttpInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockHttpInstance);

    client = new AlteriomWebhookClient({
      baseURL: 'https://webhook.alteriom.net',
      apiKey: 'test-api-key',
    });
  });

  it('should list repositories with scan_enabled filter', async () => {
    const mockRepos = [
      {
        id: 'repo-1',
        owner: 'Alteriom',
        name: 'webhook-connector',
        full_name: 'Alteriom/webhook-connector',
        scan_enabled: true,
        visibility: 'public',
        language: 'TypeScript',
      },
    ];

    (client as any).http.get = jest.fn().mockResolvedValue({
      data: { data: mockRepos },
    });

    const repos = await client.repositories.list({ scan_enabled: true });

    expect((client as any).http.get).toHaveBeenCalledWith(
      '/api/v1/repositories',
      { params: { scan_enabled: true } }
    );
    expect(repos).toEqual(mockRepos);
  });

  it('should get single repository', async () => {
    const mockRepo = {
      id: 'repo-1',
      owner: 'Alteriom',
      name: 'webhook-connector',
      full_name: 'Alteriom/webhook-connector',
      scan_enabled: true,
    };

    (client as any).http.get = jest.fn().mockResolvedValue({
      data: mockRepo,
    });

    const repo = await client.repositories.get('Alteriom', 'webhook-connector');

    expect((client as any).http.get).toHaveBeenCalledWith(
      '/api/v1/repositories/Alteriom/webhook-connector'
    );
    expect(repo).toEqual(mockRepo);
  });

  it('should update repository settings', async () => {
    const mockRepo = {
      id: 'repo-1',
      scan_enabled: false,
    };

    (client as any).http.put = jest.fn().mockResolvedValue({
      data: mockRepo,
    });

    const repo = await client.repositories.update('Alteriom', 'webhook-connector', {
      scan_enabled: false,
    });

    expect((client as any).http.put).toHaveBeenCalledWith(
      '/api/v1/repositories/Alteriom/webhook-connector',
      { scan_enabled: false }
    );
    expect(repo).toEqual(mockRepo);
  });

  it('should delete repository', async () => {
    (client as any).http.delete = jest.fn().mockResolvedValue({});

    await client.repositories.delete('Alteriom', 'old-repo');

    expect((client as any).http.delete).toHaveBeenCalledWith(
      '/api/v1/repositories/Alteriom/old-repo'
    );
  });
});

describe('HTTP Subscribers API', () => {
  let client: AlteriomWebhookClient;
  let mockHttpInstance: any;

  beforeEach(() => {
    mockHttpInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockHttpInstance);

    client = new AlteriomWebhookClient({
      baseURL: 'https://webhook.alteriom.net',
      apiKey: 'test-api-key',
    });
  });

  it('should list HTTP subscribers', async () => {
    const mockSubscribers = [
      {
        id: 'sub-1',
        name: 'Production Webhook',
        url: 'https://api.example.com/webhooks',
        events: ['dependabot_alert'],
        enabled: true,
        delivery_stats: {
          total_deliveries: 100,
          successful_deliveries: 95,
          failed_deliveries: 5,
        },
      },
    ];

    (client as any).http.get = jest.fn().mockResolvedValue({
      data: { data: mockSubscribers },
    });

    const subscribers = await client.httpSubscribers.list();

    expect(subscribers).toEqual(mockSubscribers);
  });

  it('should create HTTP subscriber', async () => {
    const mockSubscriber = {
      id: 'sub-1',
      name: 'New Webhook',
      url: 'https://api.example.com/webhooks',
      events: ['dependabot_alert'],
    };

    (client as any).http.post = jest.fn().mockResolvedValue({
      data: mockSubscriber,
    });

    const subscriber = await client.httpSubscribers.create({
      name: 'New Webhook',
      url: 'https://api.example.com/webhooks',
      secret: 'my-secret',
      events: ['dependabot_alert'],
    });

    expect(subscriber).toEqual(mockSubscriber);
  });

  it('should test HTTP subscriber', async () => {
    const mockResult = {
      success: true,
      status_code: 200,
      latency_ms: 45,
    };

    (client as any).http.post = jest.fn().mockResolvedValue({
      data: mockResult,
    });

    const result = await client.httpSubscribers.test('sub-1');

    expect((client as any).http.post).toHaveBeenCalledWith(
      '/api/v1/http-subscribers/sub-1/test'
    );
    expect(result).toEqual(mockResult);
  });
});

describe('API Keys Management', () => {
  let client: AlteriomWebhookClient;
  let mockHttpInstance: any;

  beforeEach(() => {
    mockHttpInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn(), eject: jest.fn() },
        response: { use: jest.fn(), eject: jest.fn() },
      },
    };

    mockedAxios.create = jest.fn().mockReturnValue(mockHttpInstance);

    client = new AlteriomWebhookClient({
      baseURL: 'https://webhook.alteriom.net',
      apiKey: 'test-api-key',
    });
  });

  it('should list API keys', async () => {
    const mockKeys = [
      {
        id: 'key-1',
        name: 'Production Key',
        key_prefix: 'wh_',
        scopes: ['read', 'write'],
        auto_rotate: true,
        rotation_days: 90,
      },
    ];

    (client as any).http.get = jest.fn().mockResolvedValue({
      data: { data: mockKeys },
    });

    const keys = await client.apiKeys.list();

    expect(keys).toEqual(mockKeys);
  });

  it('should create API key with auto-rotation', async () => {
    const mockResponse = {
      key: {
        id: 'key-1',
        name: 'New Key',
        key_prefix: 'wh_',
        auto_rotate: true,
        rotation_days: 90,
      },
      secret: 'wh_secret_key_value',
    };

    (client as any).http.post = jest.fn().mockResolvedValue({
      data: mockResponse,
    });

    const result = await client.apiKeys.create({
      name: 'New Key',
      description: 'Test key',
      scopes: ['read', 'write'],
      auto_rotate: true,
      rotation_days: 90,
    });

    expect(result).toEqual(mockResponse);
  });

  it('should rotate API key', async () => {
    const mockResult = {
      id: 'key-1',
      new_key: 'wh_new_secret_key_value',
      expires_at: '2027-03-05T00:00:00Z',
    };

    (client as any).http.post = jest.fn().mockResolvedValue({
      data: mockResult,
    });

    const result = await client.apiKeys.rotate('key-1');

    expect((client as any).http.post).toHaveBeenCalledWith(
      '/api/v1/keys/key-1/rotate'
    );
    expect(result).toEqual(mockResult);
  });
});
