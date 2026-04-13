/**
 * BracketCanvas.jsx — SVG bracket with absolutely-positioned team rows.
 *
 * Layout mirrors the Python html_renderer.py canvas exactly:
 * West R1 → R2 → CF → Finals ← CF ← R2 ← East R1
 *
 * The outer container is a fixed-width div (CANVAS_WIDTH px). On narrow
 * viewports, the parent wraps it in an overflow-x:auto scroll container.
 */

// ---------------------------------------------------------------------------
// ESPN logo helper (mirrors data_loader._ESPN_ABBREV_MAP)
// ---------------------------------------------------------------------------
const ESPN_ABBREV_MAP = {
  GSW: 'gs',
  NYK: 'ny',
  SAS: 'sa',
  NOP: 'no',
  NOH: 'no',
  UTA: 'utah',
  PHO: 'phx',
  WAS: 'wsh',
  BRK: 'bkn',
  CHO: 'cha',
};

function logoUrl(abbrev) {
  const espn = ESPN_ABBREV_MAP[abbrev.toUpperCase()] ?? abbrev.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nba/500/${espn}.png`;
}

// ---------------------------------------------------------------------------
// Layout constants (match Python html_renderer.py)
// ---------------------------------------------------------------------------
export const CANVAS_WIDTH = 1310; // East R1 right edge = 1130 + 180 = 1310; Finals center = 565 + 90 = 655 = 1310/2
export const CANVAS_HEIGHT = 800;
const BOX_W = 180;
const FINALS_EXTRA_W = 20; // extra width so 🏆 + % label isn't clipped in Championship % mode
const BOX_H = 115; // taller than wide (ratio 105/130 ≈ 0.808)
const BOX_INNER_SCALE = BOX_H / 75; // content scale factor relative to original CSS baseline (75px)

// X positions — CF boxes pulled in close to R2 (partial overlap)
const WEST_R1_X = 0;
const WEST_R2_X = 200;
const WEST_CF_X = 260;
const FINALS_X = 565; // center = 655 = CANVAS_WIDTH / 2
const EAST_CF_X = 870;
const EAST_R2_X = 930;
const EAST_R1_X = 1130;

// Y layout
const PAD = 20;
const SLOT = (CANVAS_HEIGHT - 2 * PAD) / 4; // 145 px per R1 slot

function r1Centers() {
  return [0, 1, 2, 3].map((i) => PAD + (i + 0.5) * SLOT);
}

function r2Centers() {
  const r1 = r1Centers();
  return [(r1[0] + r1[1]) / 2, (r1[2] + r1[3]) / 2];
}

function cfCenter() {
  const r2 = r2Centers();
  return (r2[0] + r2[1]) / 2;
}

function boxY(centerY) {
  return Math.round(centerY - BOX_H / 2);
}

// ---------------------------------------------------------------------------
// TeamRow
// ---------------------------------------------------------------------------
function TeamRow({ team, prob, isChamp, probMode, champProb, isFinals = false }) {
  if (!team) return null;
  const primary = team.color_primary ?? '#1a3a5c';
  const pillBg = `linear-gradient(90deg, ${primary} 0%, ${primary}cc 55%, ${primary}55 85%, transparent 100%)`;
  const logoBg = `${primary}66`;
  const url = logoUrl(team.abbreviation);

  // Mirrors Python html_renderer.py team_node_html prob_mode logic
  let probLabel;
  if (probMode === 'Championship %' && champProb != null) {
    probLabel = isChamp
      ? `🏆 ${Math.round(champProb * 100)}%`
      : `${Math.round(champProb * 100)}%`;
  } else {
    probLabel = `${Math.round(prob * 100)}%`;
  }

  return (
    <div className={`team-node${isChamp ? ' champion' : ''}`} style={{ flex: 1, minHeight: 0 }}>
      <div className="team-pill" style={{ background: pillBg }}>
        <span
          className="team-seed-badge"
          style={{
            width: Math.round(18 * BOX_INNER_SCALE),
            minWidth: Math.round(18 * BOX_INNER_SCALE),
            fontSize: Math.round(9 * BOX_INNER_SCALE),
          }}
        >
          {team.seed}
        </span>
        <span className="team-abbrev" style={{ fontSize: Math.round(10 * BOX_INNER_SCALE) }}>
          {team.abbreviation}
        </span>
      </div>
      <div
        className="team-logo-area"
        style={{
          background: logoBg,
          width: Math.round(30 * BOX_INNER_SCALE),
          minWidth: Math.round(30 * BOX_INNER_SCALE),
        }}
      >
        <img
          className="team-logo"
          src={url}
          alt={team.abbreviation}
          style={{
            width: Math.round(22 * BOX_INNER_SCALE),
            height: Math.round(22 * BOX_INNER_SCALE),
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <span
        className="team-prob"
        style={{
          fontSize: Math.round(10 * BOX_INNER_SCALE),
          width: Math.round((isFinals ? 44 : 28) * BOX_INNER_SCALE),
          minWidth: Math.round((isFinals ? 44 : 28) * BOX_INNER_SCALE),
        }}
      >
        {probLabel}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchupBox
// ---------------------------------------------------------------------------
function MatchupBox({ matchup, teams, champAbbrev, scale = 1, probMode, champProbs, isFinals = false }) {
  const topTeam = teams[matchup.top_team];
  const botTeam = teams[matchup.bottom_team];
  const topProb = matchup.top_win_prob;
  const botProb = 1 - topProb;

  const style =
    scale !== 1
      ? { transform: `scale(${scale})`, transformOrigin: 'center center' }
      : {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, height: BOX_H, ...style }}>
      <TeamRow
        team={topTeam}
        prob={topProb}
        isChamp={matchup.top_team === champAbbrev}
        probMode={probMode}
        champProb={champProbs?.[matchup.top_team]}
        isFinals={isFinals}
      />
      <TeamRow
        team={botTeam}
        prob={botProb}
        isChamp={matchup.bottom_team === champAbbrev}
        probMode={probMode}
        champProb={champProbs?.[matchup.bottom_team]}
        isFinals={isFinals}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Connector line helpers (SVG)
// ---------------------------------------------------------------------------
const LINE_PROPS = {
  stroke: '#3d5a80',
  strokeWidth: 1.5,
  fill: 'none',
  opacity: 0.85,
};

/**
 * Bracket arm extending rightward.
 * srcRx  — right edge of source boxes
 * gatherX — x of the vertical gather bar (midpoint of gap)
 * topCy / botCy — y centres of the two source boxes
 * dstCy — y centre of the destination box
 */
function ArmRight({ srcRx, gatherX, topCy, botCy, dstCy }) {
  const gyTop = dstCy - BOX_H / 3;
  const gyBot = dstCy + BOX_H / 3;
  return (
    <g>
      {/* top and bottom horizontal stubs */}
      <line x1={srcRx} y1={topCy} x2={gatherX} y2={topCy} {...LINE_PROPS} />
      <line x1={srcRx} y1={botCy} x2={gatherX} y2={botCy} {...LINE_PROPS} />
      {/* vertical gather bar */}
      <line x1={gatherX} y1={topCy} x2={gatherX} y2={gyTop} {...LINE_PROPS} />
      <line x1={gatherX} y1={botCy} x2={gatherX} y2={gyBot} {...LINE_PROPS} />
    </g>
  );
}

/** Bracket arm extending leftward (East side mirror). */
function ArmLeft({ srcLx, gatherX, topCy, botCy, dstCy }) {
  const gyTop = dstCy - BOX_H / 3;
  const gyBot = dstCy + BOX_H / 3;
  return (
    <g>
      <line x1={srcLx} y1={topCy} x2={gatherX} y2={topCy} {...LINE_PROPS} />
      <line x1={srcLx} y1={botCy} x2={gatherX} y2={botCy} {...LINE_PROPS} />
      <line x1={gatherX} y1={topCy} x2={gatherX} y2={gyTop} {...LINE_PROPS} />
      <line x1={gatherX} y1={botCy} x2={gatherX} y2={gyBot} {...LINE_PROPS} />
    </g>
  );
}

function HLine({ x1, x2, y }) {
  return <line x1={x1} y1={y} x2={x2} y2={y} {...LINE_PROPS} />;
}

// ---------------------------------------------------------------------------
// ConnectorLines — all bracket connector SVG lines
// ---------------------------------------------------------------------------
function ConnectorLines({ r1Y, r2Y, cfY, finalsY }) {
  const ACTUAL_H = BOX_H; // already actual rendered height

  // y-centers of each box
  const r1cy = r1Y.map((y) => y + ACTUAL_H / 2);
  const r2cy = r2Y.map((y) => y + ACTUAL_H / 2);
  const cfCy = cfY + ACTUAL_H / 2;

  // Gather x = midpoint of source right edge and dest left edge
  const gWestR1R2 = (WEST_R1_X + 0.9 * BOX_W + WEST_R2_X) / 2; // ~160
  const gWestR2CF = (WEST_R2_X + 0.9 * BOX_W + WEST_CF_X) / 2; // ~290
  const gEastR1R2 = (EAST_R1_X + EAST_R2_X + BOX_W) / 2; // ~1100
  const gEastR2CF = (EAST_R2_X + EAST_CF_X + BOX_W) / 2; // ~970

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        pointerEvents: 'none',
        overflow: 'visible',
        zIndex: 0,
      }}
    >
      {/* West R1 → R2 (pair 1: slots 0,1) */}
      <ArmRight
        srcRx={WEST_R1_X + BOX_W}
        gatherX={WEST_R1_X + 1.61 * BOX_W}
        topCy={r1cy[0]}
        botCy={r1cy[1]}
        dstCy={r2cy[0]}
      />
      {/* West R1 → R2 (pair 2: slots 2,3) */}
      <ArmRight
        srcRx={WEST_R1_X + BOX_W}
        gatherX={WEST_R1_X + 1.61 * BOX_W}
        topCy={r1cy[2]}
        botCy={r1cy[3]}
        dstCy={r2cy[1]}
      />
      {/* West R2 → CF */}
      <ArmRight
        srcRx={WEST_R2_X + BOX_W}
        gatherX={WEST_R2_X + 1.2 * BOX_W}
        topCy={r2cy[0]}
        botCy={r2cy[1]}
        dstCy={cfCy}
      />
      {/* West CF → Finals (single horizontal at cf center y) */}
      <HLine x1={WEST_CF_X + BOX_W} x2={FINALS_X} y={cfCy} />

      {/* East R1 → R2 (pair 1: slots 0,1) */}
      <ArmLeft
        srcLx={EAST_R1_X + 0.01 * BOX_W}
        gatherX={gEastR1R2 - 0.56 * BOX_W}
        topCy={r1cy[0]}
        botCy={r1cy[1]}
        dstCy={r2cy[0]}
      />
      {/* East R1 → R2 (pair 2: slots 2,3) */}
      <ArmLeft
        srcLx={EAST_R1_X + 0.01 * BOX_W}
        gatherX={gEastR1R2 - 0.56 * BOX_W}
        topCy={r1cy[2]}
        botCy={r1cy[3]}
        dstCy={r2cy[1]}
      />
      {/* East R2 → CF */}
      <ArmLeft
        srcLx={EAST_R2_X}
        gatherX={EAST_R2_X - 0.2 * BOX_W}
        topCy={r2cy[0]}
        botCy={r2cy[1]}
        dstCy={cfCy}
      />
      {/* East CF → Finals */}
      <HLine x1={EAST_CF_X} x2={FINALS_X + BOX_W} y={cfCy} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// BracketCanvas (main export)
// ---------------------------------------------------------------------------
export default function BracketCanvas({ data, probMode = 'Matchup Win %' }) {
  const { bracket, teams } = data;
  const champProbs = data.championship_probs;

  // Predicted champion = team with highest championship probability
  const champAbbrev = Object.entries(champProbs).sort(
    (a, b) => b[1] - a[1]
  )[0]?.[0];

  // R1 display order: [1v8, 4v5, 2v7, 3v6] → JSON indices [0, 3, 1, 2]
  const westR1 = [
    bracket.West.R1[0],
    bracket.West.R1[3],
    bracket.West.R1[1],
    bracket.West.R1[2],
  ];
  const eastR1 = [
    bracket.East.R1[0],
    bracket.East.R1[3],
    bracket.East.R1[1],
    bracket.East.R1[2],
  ];

  // Y coordinates
  const r1c = r1Centers();
  const r2c = r2Centers();
  const cfc = cfCenter();
  const finc = cfc;

  const r1Y = r1c.map(boxY);
  const r2Y = r2c.map(boxY);
  const cfY = boxY(cfc);
  const finalsY = boxY(finc);

  // All positioned boxes: { x, y, matchup, scale }
  const boxes = [
    // West R1
    ...westR1.map((m, i) => ({ x: WEST_R1_X, y: r1Y[i], matchup: m, scale: 1 })),
    // West R2
    ...bracket.West.R2.map((m, i) => ({ x: WEST_R2_X, y: r2Y[i], matchup: m, scale: 1 })),
    // West CF
    { x: WEST_CF_X, y: cfY, matchup: bracket.West.CF[0], scale: 1 },
    // Finals (slightly larger + wider to prevent 🏆 label clipping)
    { x: FINALS_X - FINALS_EXTRA_W / 2, y: finalsY, matchup: bracket.Finals, scale: 1.3, width: BOX_W + FINALS_EXTRA_W, isFinals: true },
    // East CF
    { x: EAST_CF_X, y: cfY, matchup: bracket.East.CF[0], scale: 1 },
    // East R2
    ...bracket.East.R2.map((m, i) => ({ x: EAST_R2_X, y: r2Y[i], matchup: m, scale: 1 })),
    // East R1
    ...eastR1.map((m, i) => ({ x: EAST_R1_X, y: r1Y[i], matchup: m, scale: 1 })),
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      }}
    >
      <ConnectorLines r1Y={r1Y} r2Y={r2Y} cfY={cfY} finalsY={finalsY} />

      {boxes.map(({ x, y, matchup, scale, width = BOX_W, isFinals = false }) => (
        <div
          key={matchup.matchup_id}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width,
            zIndex: 1,
          }}
        >
          <MatchupBox
            matchup={matchup}
            teams={teams}
            champAbbrev={isFinals ? champAbbrev : null}
            scale={scale}
            probMode={probMode}
            champProbs={champProbs}
            isFinals={isFinals}
          />
        </div>
      ))}
    </div>
  );
}
