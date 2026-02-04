/**
 * Linear API calls and data fetching
 */

import { LinearClient } from '@linear/sdk';
import type { Issue } from '@linear/sdk';
import type { LinearTicket } from './linear-api-service.types.js';
import { getMonthRange } from '../shared/date-utils.js';

/** Raw issue shape from Linear API (embedded in GraphQL response) */
interface RawIssueData {
  id: string;
  identifier?: string;
  title: string;
  description?: string | null;
  updatedAt: Date;
  startedAt?: Date | null;
  createdAt: Date;
  completedAt?: Date | null;
  assigneeId?: string | null;
  assignee?: { id: string; name: string; email?: string } | null;
  creator?: { id: string; name: string } | null;
  state?: { name: string; type: string } | null;
  labels?: { nodes: Array<{ id: string; name: string }> } | null;
}

/**
 * Create Linear client from API key
 */
export function createLinearClient(apiKey: string): LinearClient {
  return new LinearClient({ apiKey });
}

/**
 * Transform Linear SDK Issue to our LinearTicket model
 */
function mapIssueToTicket(issue: RawIssueData, viewerId: string): LinearTicket {
  const isAssigned = issue.assigneeId === viewerId;

  const activities: LinearTicket['activities'] = [];
  if (isAssigned) {
    activities.push({ type: 'assigned', date: issue.updatedAt.toString() });
  }
  activities.push({ type: 'updated', date: issue.updatedAt.toString() });

  const assignee = issue.assignee;
  const creator = issue.creator;
  const state = issue.state;
  const labels = issue.labels?.nodes ?? [];

  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    state: {
      name: state?.name ?? 'Unknown',
      type: state?.type ?? 'unknown',
    },
    assignee: assignee
      ? { id: assignee.id, name: assignee.name, email: assignee.email ?? '' }
      : undefined,
    creator: {
      id: creator?.id ?? '',
      name: creator?.name ?? 'Unknown',
    },
    labels: labels.map((l) => ({ id: l.id, name: l.name })),
    createdAt: issue.createdAt.toString(),
    updatedAt: issue.updatedAt.toString(),
    completedAt: issue.completedAt ? issue.completedAt.toString() : null,
    activities,
  };
}

/** Extract raw data from SDK Issue (SDK stores relations in _assignee, _state, etc.) */
function issueToRawData(issue: Issue): RawIssueData {
  const raw = issue as unknown as Record<string, unknown>;
  return {
    id: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description ?? null,
    updatedAt: issue.updatedAt,
    startedAt: issue.startedAt ?? undefined,
    createdAt: issue.createdAt,
    completedAt: issue.completedAt ?? null,
    assigneeId: raw.assigneeId as string | undefined,
    assignee: (raw._assignee ?? raw.assignee) as RawIssueData['assignee'],
    creator: (raw._creator ?? raw.creator) as RawIssueData['creator'],
    state: (raw._state ?? raw.state) as RawIssueData['state'],
    labels: (raw._labels ?? raw.labels) as RawIssueData['labels'],
  };
}

/** Paginated connection from Linear SDK */
interface IssueConnection {
  nodes: Issue[];
  pageInfo: { hasNextPage: boolean };
  fetchNext: () => Promise<IssueConnection>;
}

/** Page size for API requests - reduces round trips for typical workloads */
const PAGE_SIZE = 50;

/** Fetch issue IDs where the user commented in the month */
async function fetchUserCommentedIssueIds(
  client: ReturnType<typeof createLinearClient>,
  userEmail: string,
  startDate: Date,
  endDate: Date
): Promise<Set<string>> {
  const ids = new Set<string>();
  const dateRange = { gte: startDate.toISOString(), lte: endDate.toISOString() };

  let connection = await client.comments({
    first: PAGE_SIZE,
    filter: {
      user: { email: { eq: userEmail } },
      createdAt: dateRange,
    },
  });
  let nodes = connection.nodes;

  while (nodes.length > 0) {
    for (const comment of nodes) {
      const issueId = (comment as unknown as { issueId?: string }).issueId;
      if (issueId) ids.add(issueId);
    }
    if (connection.pageInfo.hasNextPage) {
      connection = await connection.fetchNext();
      nodes = connection.nodes;
    } else break;
  }
  return ids;
}

/** Include issue only if user actually worked on it (started, created, or commented) */
function userWorkedOnIssue(
  raw: RawIssueData,
  userId: string,
  startDate: Date,
  endDate: Date,
  commentedIssueIds: Set<string>
): boolean {
  const startedAt = raw.startedAt ? new Date(raw.startedAt.toString()) : null;
  const creatorId = raw.creator?.id;

  if (creatorId === userId) return true;
  if (startedAt !== null && startedAt >= startDate && startedAt <= endDate) return true;
  if (commentedIssueIds.has(raw.id)) return true;

  return false;
}

/**
 * Fetch all tickets the user has interacted with, filtered by month
 * Only includes tickets the user actually worked on (started, created, or commented)
 * When assigneeEmail is set, fetches issues assigned to that user (use when API key is for bot/integration)
 */
export async function fetchUserTicketsForMonth(
  apiKey: string,
  year: number,
  month: number,
  assigneeEmail?: string
): Promise<LinearTicket[]> {
  const client = createLinearClient(apiKey);
  const { startDate, endDate } = getMonthRange(year, month);

  const allTickets: Map<string, LinearTicket> = new Map();

  if (assigneeEmail?.trim()) {
    const email = assigneeEmail.trim();
    const commentedIssueIds = await fetchUserCommentedIssueIds(client, email, startDate, endDate);

    const dateRange = {
      gte: startDate.toISOString(),
      lte: endDate.toISOString(),
    };
    const filter = {
      assignee: { email: { eq: email } },
      or: [
        { startedAt: dateRange },
        { updatedAt: dateRange },
      ],
    };

    let connection = await client.issues({ first: PAGE_SIZE, filter });
    let nodes = connection.nodes;

    let userId: string | null = null;

    while (nodes.length > 0) {
      for (const issue of nodes) {
        const raw = issueToRawData(issue);
        if (!userId) userId = raw.assigneeId ?? raw.assignee?.id ?? null;

        if (!userWorkedOnIssue(raw, userId ?? raw.assigneeId ?? '', startDate, endDate, commentedIssueIds)) continue;

        const ticket = mapIssueToTicket(raw, raw.assigneeId ?? '');
        allTickets.set(issue.id, ticket);
      }
      if (connection.pageInfo.hasNextPage) {
        connection = await connection.fetchNext();
        nodes = connection.nodes;
      } else break;
    }
  } else {
    const viewer = await client.viewer;
    if (!viewer) throw new Error('Failed to fetch current user from Linear');
    const viewerId = viewer.id;
    const viewerEmail = viewer.email ?? '';
    const commentedIssueIds =
      viewerEmail ? await fetchUserCommentedIssueIds(client, viewerEmail, startDate, endDate) : new Set<string>();

    const fetchAndMerge = async (fetchFn: () => Promise<IssueConnection>) => {
      let connection = await fetchFn();
      let nodes = connection.nodes;
      while (nodes.length > 0) {
        for (const issue of nodes) {
          const raw = issueToRawData(issue);
          const updatedAt = new Date(raw.updatedAt.toString());
          const startedAt = raw.startedAt ? new Date(raw.startedAt.toString()) : null;
          const inMonth =
            (updatedAt >= startDate && updatedAt <= endDate) ||
            (startedAt !== null && startedAt >= startDate && startedAt <= endDate);
          if (!inMonth) continue;
          if (!userWorkedOnIssue(raw, viewerId, startDate, endDate, commentedIssueIds)) continue;

          const ticket = mapIssueToTicket(raw, viewerId);
          allTickets.set(issue.id, ticket);
        }
        if (connection.pageInfo.hasNextPage) {
          connection = await connection.fetchNext();
          nodes = connection.nodes;
        } else break;
      }
    };

    await Promise.all([
      fetchAndMerge(() => viewer.assignedIssues()),
      fetchAndMerge(() => viewer.createdIssues()),
      fetchAndMerge(() => viewer.delegatedIssues()),
    ]);
  }

  return Array.from(allTickets.values()).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
}
