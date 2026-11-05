import { GitCommit, GraphLink, GraphNodeLayout, GraphStyle } from '../types/git';

export const GRAPH_COLORS = [
  '#0085d9', // Vivid Blue (vscode-git-graph #1)
  '#d9008f', // Magenta Pink (vscode-git-graph #2)
  '#00d90a', // Emerald Green (vscode-git-graph #3)
  '#d98500', // Amber Orange (vscode-git-graph #4)
  '#a300d9', // Electric Purple (vscode-git-graph #5)
  '#ff2e4c', // Crimson Red
  '#00d9cc', // Cyan Teal
  '#e138e8', // Orchid
  '#85d900', // Lime
  '#dc5b23', // Tangerine
  '#6f24d6', // Indigo
  '#ffcc00', // Gold
];

export interface ComputedGraph {
  nodes: GraphNodeLayout[];
  links: GraphLink[];
  maxColumns: number;
}

/**
 * Computes the column & color assignment for each commit row and the connecting
 * edges between commits, closely modeled after mhutchie/vscode-git-graph.
 */
export function computeGitGraph(commits: GitCommit[]): ComputedGraph {
  const rowByHash = new Map<string, number>();
  commits.forEach((c, idx) => {
    rowByHash.set(c.hash, idx);
  });

  // Active lanes at the current row scan: each lane holds the target commit hash it is heading towards
  interface ActiveLane {
    targetHash: string;
    colorIndex: number;
  }

  const activeLanes: (ActiveLane | null)[] = [];
  const nodes: GraphNodeLayout[] = [];
  const links: GraphLink[] = [];
  let nextColorCounter = 0;
  let globalMaxCols = 1;

  const allocColor = () => {
    const c = nextColorCounter % GRAPH_COLORS.length;
    nextColorCounter++;
    return c;
  };

  const findFreeLane = (preferredCol?: number): number => {
    if (
      preferredCol !== undefined &&
      preferredCol >= 0 &&
      (preferredCol >= activeLanes.length || activeLanes[preferredCol] === null)
    ) {
      while (activeLanes.length <= preferredCol) {
        activeLanes.push(null);
      }
      return preferredCol;
    }
    const existingNull = activeLanes.findIndex((l) => l === null);
    if (existingNull !== -1) return existingNull;
    activeLanes.push(null);
    return activeLanes.length - 1;
  };

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];

    // Find all lanes currently targeting this commit
    const incomingCols: number[] = [];
    for (let col = 0; col < activeLanes.length; col++) {
      if (activeLanes[col]?.targetHash === commit.hash) {
        incomingCols.push(col);
      }
    }

    let commitCol: number;
    let commitColor: number;

    if (incomingCols.length > 0) {
      // Pick the leftmost incoming lane for this commit
      commitCol = incomingCols[0];
      commitColor = activeLanes[commitCol]!.colorIndex;
      // Clear any duplicate lanes that converged into this commit
      for (let i = 1; i < incomingCols.length; i++) {
        activeLanes[incomingCols[i]] = null;
      }
    } else {
      // New branch tip (or uncommitted node)
      commitCol = findFreeLane();
      commitColor = commit.isUncommitted ? 0 : allocColor();
      activeLanes[commitCol] = {
        targetHash: commit.hash,
        colorIndex: commitColor,
      };
    }

    // Record straight pass-through links for all OTHER active lanes that do not stop at this row
    const activePassCols: { col: number; colorIndex: number; targetHash: string }[] = [];
    for (let col = 0; col < activeLanes.length; col++) {
      const lane = activeLanes[col];
      if (lane && lane.targetHash !== commit.hash) {
        activePassCols.push({ col, colorIndex: lane.colorIndex, targetHash: lane.targetHash });
      }
    }

    // Free current commit lane before assigning its parents
    activeLanes[commitCol] = null;

    // Filter parents that actually exist in our loaded commit list
    const validParents = commit.parents.filter((p) => rowByHash.has(p));

    if (validParents.length > 0) {
      // First parent continues in the same lane if possible
      const firstParent = validParents[0];
      const existingFirstParentCol = activeLanes.findIndex(
        (l) => l?.targetHash === firstParent
      );

      if (existingFirstParentCol !== -1) {
        // First parent already has an active lane: link from commitCol to existingFirstParentCol (or straight down)
        links.push({
          fromRow: row,
          fromCol: commitCol,
          toRow: row + 1,
          toCol: existingFirstParentCol,
          colorIndex: commitColor,
          isUncommitted: commit.isUncommitted,
        });
      } else {
        // Keep first parent in commitCol
        activeLanes[commitCol] = {
          targetHash: firstParent,
          colorIndex: commit.isUncommitted ? 0 : commitColor,
        };
        links.push({
          fromRow: row,
          fromCol: commitCol,
          toRow: row + 1,
          toCol: commitCol,
          colorIndex: commitColor,
          isUncommitted: commit.isUncommitted,
        });
      }

      // Additional parents (merge parents)
      for (let pIdx = 1; pIdx < validParents.length; pIdx++) {
        const mergeParent = validParents[pIdx];
        const existingMergeCol = activeLanes.findIndex(
          (l) => l?.targetHash === mergeParent
        );

        if (existingMergeCol !== -1) {
          const laneColor = activeLanes[existingMergeCol]!.colorIndex;
          links.push({
            fromRow: row,
            fromCol: commitCol,
            toRow: row + 1,
            toCol: existingMergeCol,
            colorIndex: laneColor,
            isMerge: true,
          });
        } else {
          const newCol = findFreeLane(commitCol + 1);
          const mergeColor = allocColor();
          activeLanes[newCol] = {
            targetHash: mergeParent,
            colorIndex: mergeColor,
          };
          links.push({
            fromRow: row,
            fromCol: commitCol,
            toRow: row + 1,
            toCol: newCol,
            colorIndex: mergeColor,
            isMerge: true,
          });
        }
      }
    }

    // Add pass-through vertical links from row -> row + 1 for other active lanes
    for (const pass of activePassCols) {
      links.push({
        fromRow: row,
        fromCol: pass.col,
        toRow: row + 1,
        toCol: pass.col,
        colorIndex: pass.colorIndex,
      });
    }

    // Trim trailing null lanes
    while (activeLanes.length > 0 && activeLanes[activeLanes.length - 1] === null) {
      activeLanes.pop();
    }

    const rowCols = Math.max(commitCol + 1, activeLanes.length, 1);
    if (rowCols > globalMaxCols) {
      globalMaxCols = rowCols;
    }

    nodes.push({
      commit,
      row,
      col: commitCol,
      colorIndex: commitColor,
      maxColumnsInRow: rowCols,
    });
  }

  return {
    nodes,
    links,
    maxColumns: Math.min(Math.max(globalMaxCols, 2), 18),
  };
}

/**
 * Generates an SVG path string between two row/column coordinates
 * supporting both 'curved' (smooth cubic bezier) and 'angular' (vscode-git-graph angular).
 */
export function buildSvgLinkPath(
  link: GraphLink,
  rowHeight: number,
  colWidth: number,
  padLeft: number,
  style: GraphStyle
): string {
  const x1 = padLeft + link.fromCol * colWidth;
  const y1 = link.fromRow * rowHeight + rowHeight / 2;
  const x2 = padLeft + link.toCol * colWidth;
  const y2 = link.toRow * rowHeight + rowHeight / 2;

  if (link.fromCol === link.toCol) {
    return `M ${x1} ${y1} L ${x2} ${y2}`;
  }

  if (style === 'angular') {
    const cornerOffset = rowHeight * 0.38;
    if (link.isMerge) {
      return `M ${x1} ${y1} L ${x2} ${y1 + cornerOffset} L ${x2} ${y2}`;
    } else {
      return `M ${x1} ${y1} L ${x1} ${y2 - cornerOffset} L ${x2} ${y2}`;
    }
  }

  // Curved (smooth cubic bezier like vscode-git-graph)
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
}
