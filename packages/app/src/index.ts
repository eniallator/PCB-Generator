import { Vector } from "@web-art/linear-algebra";
import { config } from "./config";
import { AppContext, AppContextWithState, appMethods } from "./lib/types";
import { checkExhausted, posMod } from "@web-art/core";
import { InitParserValues, ParamConfig } from "@web-art/config-parser";

interface Wire {
  type: "Wire";
  conn: Vector<2>;
  time: number;
}

interface Resistor {
  type: "Resistor";
  conn: Vector<2>;
  time: number;
}

type FilledCell = Wire | Resistor;
type Cell = FilledCell | null;

const xPadding = 2;

const sanitizeDirections = (directions: (readonly [number, number])[]) =>
  directions
    .map(dir => dir.map(Math.round) as [number, number])
    .filter(dir => dir.some(n => n !== 0));

const newCell = (
  paramConfig: ParamConfig<InitParserValues<typeof config>>,
  time: number,
  connection: Vector<2> = Vector.create(
    ...(sanitizeDirections(paramConfig.getValue("directions"))[
      Math.floor(
        Math.random() *
          sanitizeDirections(paramConfig.getValue("directions")).length
      )
    ] as [number, number])
  )
): FilledCell => {
  return Math.random() < paramConfig.getValue("resistor-chance")
    ? { type: "Resistor", conn: connection, time }
    : { type: "Wire", conn: connection, time };
};

function countExisting(
  grid: Cell[][],
  x: number,
  y: number,
  paramConfig: ParamConfig<InitParserValues<typeof config>>,
  time?: number
) {
  return sanitizeDirections(paramConfig.getValue("directions")).reduce(
    (acc, [dx, dy]) => {
      const cell = grid[x + dx]?.[y + dy];
      return (
        acc +
        (cell == null || cell.time === time
          ? 0
          : cell.type === "Resistor"
            ? Number(cell.conn.equals(-dx, -dy) || cell.conn.equals(dx, dy))
            : Number(cell.conn.equals(-dx, -dy)))
      );
    },
    0
  );
}

function possibleCells(
  grid: Cell[][],
  x: number,
  y: number,
  paramConfig: ParamConfig<InitParserValues<typeof config>>,
  time: number
): FilledCell[] {
  const cellTypes: FilledCell[] = [];
  const directions = sanitizeDirections(paramConfig.getValue("directions"));
  for (const [dx, dy] of directions) {
    const gridCell = grid[posMod(x + dx, grid.length)]?.[y + dy];

    const hasOverlap =
      dx !== 0 &&
      dy !== 0 &&
      (grid[x]?.[y + dy]?.conn?.equals(dx, -dy) ||
        grid[posMod(x + dx, grid.length)]?.[y]?.conn?.equals(-dx, dy));

    if (gridCell != null && gridCell.time !== time && !hasOverlap) {
      const connection = Vector.create(dx, dy);
      switch (gridCell.type) {
        case "Wire":
          if (countExisting(grid, x + dx, y + dy, paramConfig, time) < 2)
            cellTypes.push(newCell(paramConfig, time, connection));
          break;
        case "Resistor":
          if (gridCell.conn.equals(dx, dy) || gridCell.conn.equals(-dx, -dy))
            cellTypes.push({ type: "Wire", conn: connection, time });
          break;
        default:
          return checkExhausted(gridCell);
      }
    }
  }
  return Math.random() < paramConfig.getValue("place-chance") ? cellTypes : [];
}

function placeCells(
  grid: Cell[][],
  paramConfig: ParamConfig<InitParserValues<typeof config>>,
  time: number
): void {
  for (let x = 0; x < grid.length; x++) {
    for (let y = 0; y < (grid[0]?.length as number); y++) {
      if (grid[x]?.[y] == null) {
        const cellTypes = possibleCells(grid, x, y, paramConfig, time);
        if (cellTypes.length > 0) {
          (grid[x] as Cell[])[y] = cellTypes[
            Math.floor(Math.random() * cellTypes.length)
          ] as Cell;
        } else if (Math.random() < paramConfig.getValue("random-cell-chance")) {
          (grid[x] as Cell[])[y] = newCell(paramConfig, time);
        }
      }
    }
  }
}

function clearEndCells(grid: Cell[][], xOffset: number): Cell[][] {
  const start = Math.ceil(
    posMod(grid.length - xPadding - xOffset, grid.length)
  );

  const result = [...grid];
  for (let i = start; i < start + xPadding; i++) {
    result[posMod(i, grid.length)] = new Array<null>(
      grid[0]?.length as number
    ).fill(null);
  }
  return result;
}

function drawGrid(
  { canvas, ctx, paramConfig }: AppContextWithState<typeof config, State>,
  grid: Cell[][],
  xOffset: number
) {
  const toDrawVec = (x: number, y: number): Vector<2> =>
    Vector.create(
      ((posMod(x + xOffset, grid.length) - xPadding) /
        (grid.length - 2 * xPadding)) *
        canvas.width,
      (y / (grid[0]?.length as number)) * canvas.height
    );
  const resistors: [number, number, Resistor][] = [];
  grid.forEach((column, x) => {
    column.forEach((cell, y) => {
      if (cell != null) {
        const start = toDrawVec(x + 0.5, y + 0.5);
        const end = toDrawVec(x + cell.conn.x() + 0.5, y + cell.conn.y() + 0.5);
        if (Math.abs(start.x() - end.x()) < canvas.width / 2) {
          if (cell.type === "Resistor") resistors.push([x, y, cell]);

          ctx.lineWidth = Math.max(
            paramConfig.getValue("cell-size") * (3 / 50),
            1
          );
          ctx.strokeStyle = `#${paramConfig.getValue("wire-colour")}`;
          ctx.beginPath();
          ctx.moveTo(...start.toArray());
          ctx.lineTo(...end.toArray());
          ctx.stroke();
        }
      }
    });
  });

  resistors.forEach(([x, y, res]) => {
    ctx.lineWidth = (0.4 / grid.length) * canvas.width;

    const start = toDrawVec(
      x + 0.5 + res.conn.x() * 0.25,
      y + 0.5 + res.conn.y() * 0.25
    );
    const end = toDrawVec(
      x + 0.5 + res.conn.x() * 0.75,
      y + 0.5 + res.conn.y() * 0.75
    );

    ctx.lineCap = "round";
    ctx.strokeStyle = `#${paramConfig.getValue("resistor-bg-colour")}`;
    ctx.beginPath();
    ctx.moveTo(...start.toArray());
    ctx.lineTo(...end.toArray());
    ctx.stroke();

    paramConfig.getValue("resistor-colours").forEach(([col], i, arr) => {
      ctx.lineCap = "butt";
      ctx.strokeStyle = `#${col}`;
      ctx.beginPath();
      ctx.moveTo(...start.lerp(end, (i + 0.2) / arr.length).toArray());
      ctx.lineTo(...start.lerp(end, (i + 0.8) / arr.length).toArray());
      ctx.stroke();
    });
  });
}

interface State {
  // grid[x][y] so the columns can be circular, making them easily replaceable
  grid: Cell[][];
  dtAcc: number;
}

function init({ canvas, paramConfig }: AppContext<typeof config>): State {
  const grid: Cell[][] = new Array(
    Math.ceil(canvas.width / paramConfig.getValue("cell-size")) + xPadding * 2
  )
    .fill(undefined)
    .map(() =>
      new Array<null>(
        Math.ceil(canvas.height / paramConfig.getValue("cell-size"))
      ).fill(null)
    );
  (grid[Math.floor(grid.length / 2)] as Cell[])[
    Math.floor(Math.ceil(canvas.height / paramConfig.getValue("cell-size")) / 2)
  ] = newCell(paramConfig, 0);
  return { grid, dtAcc: 0 };
}

function animationFrame(
  appCtx: AppContextWithState<typeof config, State>
): State {
  const { time, ctx, canvas, paramConfig } = appCtx;
  let state = appCtx.state;
  ctx.fillStyle = `#${paramConfig.getValue("bg-colour")}`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (
    Math.ceil(canvas.width / paramConfig.getValue("cell-size")) +
      xPadding * 2 !==
    state.grid.length
  ) {
    state = init(appCtx);
  }

  const xOffset =
    -(time.now - time.animationStart) * paramConfig.getValue("move-speed");

  const newDtAcc = state.dtAcc + time.delta;

  let grid = state.grid;
  if (newDtAcc > paramConfig.getValue("place-speed")) {
    placeCells(grid, paramConfig, time.now);
  }
  grid = clearEndCells(grid, xOffset);

  drawGrid(appCtx, grid, xOffset);

  return { grid, dtAcc: newDtAcc % paramConfig.getValue("place-speed") };
}

export default appMethods.stateful({
  init,
  animationFrame,
  onResize: (evt, ctx) => init(ctx),
});
