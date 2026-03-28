/**
 * Tests for typed aggregate shapes and filter params
 * @jest-environment node
 */

import type {
  AggregateType,
  TypedAggregate,
  EventAggregate,
  AggregateListParams,
  WorkflowRunSummary,
  PullRequestSummary,
  IssueSummary,
  WorkflowJobSummary,
  ReleaseSummary,
  DeploymentSummary,
  BranchActivitySummary,
  CheckRunSummary,
  CheckSuiteSummary,
} from '../src/types';

// ---------------------------------------------------------------------------
// Helper: build a base EventAggregate without aggregate_type / summary
// ---------------------------------------------------------------------------
function baseAggregate(overrides?: Partial<EventAggregate>): Omit<EventAggregate, 'aggregate_type' | 'summary'> {
  return {
    id: 'agg-1',
    repository: 'Alteriom/alteriom-firmware',
    entity_type: 'workflow',
    entity_id: 'Alteriom/alteriom-firmware/runs/12345',
    event_count: 3,
    first_event_at: '2026-03-01T00:00:00Z',
    last_event_at: '2026-03-28T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AggregateType union
// ---------------------------------------------------------------------------
describe('AggregateType union', () => {
  it('accepts all expected aggregate_type literals', () => {
    const types: AggregateType[] = [
      'workflow_run',
      'workflow_job',
      'pull_request',
      'push',
      'issue',
      'release',
      'deployment',
      'deployment_status',
      'check_run',
      'check_suite',
      'branch_activity',
      'email_delivery',
      'security_advisory',
      'code_scanning_alert',
      'dependabot_alert',
      'registry_package',
      'ref_activity',
      'project_item',
      'label_activity',
      'commit_status',
      'repository_config',
      'workflow_dispatch',
    ];
    // All values compile and are assignable — length check guards against typos
    expect(types).toHaveLength(22);
  });

  it('EventAggregate.aggregate_type accepts AggregateType value', () => {
    const agg: EventAggregate = {
      ...baseAggregate(),
      aggregate_type: 'workflow_run',
      summary: {},
    };
    expect(agg.aggregate_type).toBe('workflow_run');
  });
});

// ---------------------------------------------------------------------------
// TypedAggregate discrimination
// ---------------------------------------------------------------------------
describe('TypedAggregate discriminated union', () => {
  it('narrows to WorkflowRunSummary on aggregate_type === workflow_run', () => {
    const wfRunSummary: WorkflowRunSummary = {
      workflow_name: 'CI',
      workflow_id: 1001,
      run_id: 99999,
      run_number: 42,
      status: 'completed',
      conclusion: 'success',
      branch: 'main',
      commit: 'abc1234',
      actor: 'sparck75',
      url: 'https://github.com/Alteriom/alteriom-firmware/actions/runs/99999',
    };

    const agg: TypedAggregate = {
      ...baseAggregate(),
      aggregate_type: 'workflow_run',
      summary: wfRunSummary,
    };

    if (agg.aggregate_type === 'workflow_run') {
      // TypeScript should narrow summary to WorkflowRunSummary here
      expect(agg.summary.workflow_name).toBe('CI');
      expect(agg.summary.run_number).toBe(42);
      expect(agg.summary.conclusion).toBe('success');
      expect(agg.summary.branch).toBe('main');
    } else {
      fail('aggregate_type should have been workflow_run');
    }
  });

  it('narrows to PullRequestSummary on aggregate_type === pull_request', () => {
    const prSummary: PullRequestSummary = {
      number: 77,
      title: 'feat: add LoRa mesh support',
      state: 'open',
      author: 'sparck75',
      head: 'feature/lora-mesh',
      base: 'main',
      url: 'https://github.com/Alteriom/alteriom-firmware/pull/77',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'pull_request' }),
      aggregate_type: 'pull_request',
      summary: prSummary,
    };

    if (agg.aggregate_type === 'pull_request') {
      expect(agg.summary.number).toBe(77);
      expect(agg.summary.title).toBe('feat: add LoRa mesh support');
      expect(agg.summary.head).toBe('feature/lora-mesh');
    } else {
      fail('aggregate_type should have been pull_request');
    }
  });

  it('narrows to IssueSummary on aggregate_type === issue', () => {
    const issueSummary: IssueSummary = {
      number: 12,
      title: 'Bug: sensor drops packets',
      state: 'open',
      author: 'sparck75',
      url: 'https://github.com/Alteriom/alteriom-firmware/issues/12',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'issue' }),
      aggregate_type: 'issue',
      summary: issueSummary,
    };

    if (agg.aggregate_type === 'issue') {
      expect(agg.summary.number).toBe(12);
      expect(agg.summary.state).toBe('open');
    }
  });

  it('narrows to WorkflowJobSummary on aggregate_type === workflow_job', () => {
    const jobSummary: WorkflowJobSummary = {
      job_name: 'build',
      job_id: 55555,
      run_id: 99999,
      status: 'completed',
      conclusion: 'failure',
      runner: 'ubuntu-latest',
      url: 'https://github.com/Alteriom/alteriom-firmware/actions/runs/99999/jobs/55555',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_id: 'Alteriom/alteriom-firmware/jobs/55555' }),
      aggregate_type: 'workflow_job',
      summary: jobSummary,
    };

    if (agg.aggregate_type === 'workflow_job') {
      expect(agg.summary.conclusion).toBe('failure');
      expect(agg.summary.job_name).toBe('build');
    }
  });

  it('narrows to BranchActivitySummary on aggregate_type === branch_activity', () => {
    const branchSummary: BranchActivitySummary = {
      branch: 'main',
      commits: 5,
      pusher: 'sparck75',
      head: 'deadbeef',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'other', entity_id: 'Alteriom/alteriom-firmware/branches/main' }),
      aggregate_type: 'branch_activity',
      summary: branchSummary,
    };

    if (agg.aggregate_type === 'branch_activity') {
      expect(agg.summary.commits).toBe(5);
      expect(agg.summary.branch).toBe('main');
    }
  });

  it('narrows to DeploymentSummary on aggregate_type === deployment', () => {
    const deploymentSummary: DeploymentSummary = {
      deployment_id: 9876,
      environment: 'production',
      ref: 'main',
      commit: 'abc1234',
      state: 'success',
      creator: 'sparck75',
      url: 'https://api.github.com/repos/Alteriom/alteriom-firmware/deployments/9876',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'other' }),
      aggregate_type: 'deployment',
      summary: deploymentSummary,
    };

    if (agg.aggregate_type === 'deployment') {
      expect(agg.summary.environment).toBe('production');
      expect(agg.summary.state).toBe('success');
    }
  });

  it('narrows to CheckRunSummary on aggregate_type === check_run', () => {
    const checkRunSummary: CheckRunSummary = {
      name: 'Test Suite',
      status: 'completed',
      conclusion: 'success',
      commit: 'abc1234',
      url: 'https://github.com/Alteriom/alteriom-firmware/runs/999',
    };

    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'other' }),
      aggregate_type: 'check_run',
      summary: checkRunSummary,
    };

    if (agg.aggregate_type === 'check_run') {
      expect(agg.summary.name).toBe('Test Suite');
      expect(agg.summary.conclusion).toBe('success');
    }
  });
});

// ---------------------------------------------------------------------------
// TypedAggregate switch exhaustiveness
// ---------------------------------------------------------------------------
describe('TypedAggregate switch coverage', () => {
  function getLabel(agg: TypedAggregate): string {
    switch (agg.aggregate_type) {
      case 'workflow_run':    return `run #${agg.summary.run_number}`;
      case 'workflow_job':    return `job ${agg.summary.job_name}`;
      case 'pull_request':    return `PR #${agg.summary.number}`;
      case 'issue':           return `Issue #${agg.summary.number}`;
      case 'release':         return `Release ${agg.summary.tag}`;
      case 'deployment':      return `Deploy to ${agg.summary.environment}`;
      case 'deployment_status': return `Deploy to ${agg.summary.environment}`;
      case 'check_run':       return `Check ${agg.summary.name}`;
      case 'check_suite':     return `Suite ${agg.summary.name}`;
      case 'branch_activity': return `Branch ${agg.summary.branch}`;
      case 'push':            return `Push to ${agg.summary.branch}`;
      case 'email_delivery':  return `Email ${agg.summary.message_id}`;
      case 'security_advisory': return `Advisory ${agg.summary.ghsa_id}`;
      case 'code_scanning_alert': return `CodeScan #${agg.summary.alert_number}`;
      case 'dependabot_alert': return `Dependabot #${agg.summary.alert_number}`;
      case 'registry_package': return `Package ${agg.summary.package_name}`;
      case 'ref_activity':    return `Ref ${agg.summary.ref}`;
      case 'project_item':    return `Item ${agg.summary.item_id}`;
      case 'label_activity':  return `Label ${agg.summary.label_name}`;
      case 'commit_status':   return `Status ${agg.summary.context}`;
      case 'repository_config': return `Repo ${agg.summary.repo_name}`;
      case 'workflow_dispatch': return `Dispatch ${agg.summary.workflow_name}`;
    }
  }

  it('handles workflow_run in switch', () => {
    const agg: TypedAggregate = {
      ...baseAggregate(),
      aggregate_type: 'workflow_run',
      summary: {
        workflow_name: 'CI', workflow_id: 1, run_id: 2, run_number: 7,
        status: 'completed', conclusion: 'success', branch: 'main',
        commit: 'abc1234', actor: 'sparck75', url: 'https://example.com',
      },
    };
    expect(getLabel(agg)).toBe('run #7');
  });

  it('handles pull_request in switch', () => {
    const agg: TypedAggregate = {
      ...baseAggregate({ entity_type: 'pull_request' }),
      aggregate_type: 'pull_request',
      summary: {
        number: 99, title: 'Fix', state: 'open', author: 'user',
        head: 'fix/bug', base: 'main', url: 'https://example.com',
      },
    };
    expect(getLabel(agg)).toBe('PR #99');
  });
});

// ---------------------------------------------------------------------------
// AggregateListParams — new filter fields
// ---------------------------------------------------------------------------
describe('AggregateListParams new filter fields', () => {
  it('accepts branch filter', () => {
    const params: AggregateListParams = { branch: 'main' };
    expect(params.branch).toBe('main');
  });

  it('accepts conclusion filter', () => {
    const params: AggregateListParams = { conclusion: 'success' };
    expect(params.conclusion).toBe('success');
  });

  it('accepts workflow_name filter', () => {
    const params: AggregateListParams = { workflow_name: 'CI' };
    expect(params.workflow_name).toBe('CI');
  });

  it('accepts all three new filters together with existing params', () => {
    const params: AggregateListParams = {
      repository: 'Alteriom/alteriom-firmware',
      aggregate_type: 'workflow_run',
      branch: 'main',
      conclusion: 'failure',
      workflow_name: 'CI',
      limit: 20,
      sort_by: 'last_event_at',
      sort_direction: 'desc',
    };
    expect(params.branch).toBe('main');
    expect(params.conclusion).toBe('failure');
    expect(params.workflow_name).toBe('CI');
    expect(params.limit).toBe(20);
  });

  it('all fields remain optional', () => {
    // Should compile and work with zero fields
    const params: AggregateListParams = {};
    expect(params.branch).toBeUndefined();
    expect(params.conclusion).toBeUndefined();
    expect(params.workflow_name).toBeUndefined();
  });
});
