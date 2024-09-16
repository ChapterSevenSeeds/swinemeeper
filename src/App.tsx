import './styles.css';

import classNames from 'classnames';
import _ from 'lodash';
import { useEffect, useRef, useState } from 'react';

type Node = {
  row: number,
  column: number,
  status: "untouched" | "flagged" | "open",
  bomb: boolean
}

function* iterateCoordinates(rows: number, columns: number) {
  for (let row = 0; row < rows; ++row) {
    for (let column = 0; column < columns; ++column) {
      yield { row, column };
    }
  }
}

export default function App() {
  const [grid, setGrid] = useState<Node[][]>([]);
  const [width, setWidth] = useState(10);
  const [height, setHeight] = useState(10);
  const [bombs, setBombs] = useState(10);
  const isFirstCellClicked = useRef(false);

  useEffect(() => {
    const newGrid: Node[][] = [];
    for (let row = 0; row < height; ++row) {
      const rowObj: Node[] = [];
      for (let column = 0; column < width; ++column) {
        rowObj.push({
          row,
          column,
          status: "untouched",
          bomb: false
        });
      }
      newGrid.push(rowObj);
    }

    setGrid(newGrid);
  }, [width, height]);

  function countSurroundingBombs(row: number, column: number) {
    return getSurroundingCells(row, column).filter(x => x.bomb).length;
  }

  function getSurroundingCells(row: number, column: number) {
    const cells: Node[] = [];
    for (const rowOffset of [-1, 0, 1]) {
      for (const columnOffset of [-1, 0, 1]) {
        if (rowOffset === 0 && columnOffset === 0) continue;

        const newRow = row + rowOffset;
        const newColumn = column + columnOffset;

        if (newRow < 0 || newRow >= height) continue;
        if (newColumn < 0 || newColumn >= width) continue;

        cells.push(grid[newRow][newColumn]);
      }
    }

    return cells;
  }


  function clickCell(cell: Node) {
    if (!isFirstCellClicked.current) {
      // Populate bombs
      for (const bomb of _.chain(Array.from(iterateCoordinates(height, width))).filter(x => x.column !== cell.column && x.row !== cell.row).sampleSize(bombs).value()) {
        const correspondingNode = grid[bomb.row][bomb.column];
        correspondingNode.bomb = true;
      }

      isFirstCellClicked.current = true;
    }

    cell.status = "open";

    const visited: Set<`${number},${number}`> = new Set([`${cell.row},${cell.column}`] as const);
    const cellsToAttemptToExpand: Node[] = getSurroundingCells(cell.row, cell.column);
    while (cellsToAttemptToExpand.length > 0) {
      const currentCell = cellsToAttemptToExpand.shift()!;
      visited.add(`${currentCell.row},${currentCell.column}`);
      const surroundingBombs = countSurroundingBombs(currentCell.row, currentCell.column);
      if (surroundingBombs === 0) {
        currentCell.status = "open";
      }

      for (const neighbor of getSurroundingCells(currentCell.row, currentCell.column)) {
        if (visited.has(`${neighbor.row},${neighbor.column}`)) continue;
        cellsToAttemptToExpand.push(neighbor);
      }
    }

    setGrid([...grid]);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {grid.map((row, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "row" }}>
          {row.map(cell => (
            <div key={cell.column} className={classNames("cell", cell.status === "open" ? "cell-open" : "cell-not-open")} style={{ boxShadow: "inset #0000aa 0 0 0px 3px", width: "30px", height: "30px", display: "flex", justifyContent: "center", lineHeight: "30px" }} onClick={() => clickCell(cell)}>
              {cell.status === "open" ? countSurroundingBombs(cell.row, cell.column) > 0 ? countSurroundingBombs(cell.row, cell.column) : "" : ""}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}