import "./styles.css";

import classNames from "classnames";
import _ from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";

type Node = {
    row: number;
    column: number;
    status: "untouched" | "flagged" | "open";
    bomb: boolean;
};

type CellHash = `${number},${number}`;

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

    const populateGrid = useCallback(() => {
        isFirstCellClicked.current = false;
        const newGrid: Node[][] = [];
        for (let row = 0; row < height; ++row) {
            const rowObj: Node[] = [];
            for (let column = 0; column < width; ++column) {
                rowObj.push({
                    row,
                    column,
                    status: "untouched",
                    bomb: false,
                });
            }
            newGrid.push(rowObj);
        }

        setGrid(newGrid);
    }, [height, width]);

    useEffect(() => {
        populateGrid();
    }, [populateGrid]);

    function countSurroundingBombs(row: number, column: number) {
        return getSurroundingCells(row, column).filter((x) => x.bomb).length;
    }

    function getSurroundingCells(
        row: number,
        column: number,
        excludeDiagonals = false
    ) {
        const cells: Node[] = [];
        for (const rowOffset of [-1, 0, 1]) {
            for (const columnOffset of [-1, 0, 1]) {
                if (rowOffset === 0 && columnOffset === 0) continue;
                if (excludeDiagonals && rowOffset !== 0 && columnOffset !== 0)
                    continue;

                const newRow = row + rowOffset;
                const newColumn = column + columnOffset;

                if (newRow < 0 || newRow >= height) continue;
                if (newColumn < 0 || newColumn >= width) continue;

                cells.push(grid[newRow][newColumn]);
            }
        }

        return cells;
    }

    function clickCell(e: React.MouseEvent<HTMLDivElement>, cell: Node) {
        const isFirstClick = !isFirstCellClicked.current;
        if (!isFirstCellClicked.current) {
            // Populate bombs
            const surroundingCellCoordinates = new Set<CellHash>(
                getSurroundingCells(cell.row, cell.column).map(
                    (x) => `${x.row},${x.column}`
                ) as CellHash[]
            );
            for (const bomb of _.chain(
                Array.from(iterateCoordinates(height, width))
            )
                .filter(
                    (x) =>
                        x.column !== cell.column &&
                        x.row !== cell.row &&
                        !surroundingCellCoordinates.has(`${x.row},${x.column}`)
                )
                .sampleSize(bombs)
                .value()) {
                const correspondingNode = grid[bomb.row][bomb.column];
                correspondingNode.bomb = true;
            }

            isFirstCellClicked.current = true;
        }

        if (cell.status === "flagged") {
            rightClickCell(e, cell);
            return;
        } else if (cell.bomb) {
            alert("You died");
            for (const cell of grid.flat()) {
                if (!cell.bomb) continue;
                cell.status = "open";
            }
            setGrid([...grid]);
            return;
        }

        cell.status = "open";

        const visited: Set<CellHash> = new Set([
            `${cell.row},${cell.column}`,
        ] as const);
        let cellsToAttemptToExpand: Node[] = getSurroundingCells(
            cell.row,
            cell.column
        ).filter((x) => !x.bomb);
        if (!isFirstClick) {
            cellsToAttemptToExpand = cellsToAttemptToExpand.filter(
                (x) => countSurroundingBombs(x.row, x.column) === 0
            );
        }
        for (const toExpand of cellsToAttemptToExpand) {
            visited.add(`${toExpand.row},${toExpand.column}`);
        }
        while (cellsToAttemptToExpand.length > 0) {
            const currentCell = cellsToAttemptToExpand.shift()!;
            const surroundingBombs = countSurroundingBombs(
                currentCell.row,
                currentCell.column
            );
            if (surroundingBombs === 0) {
                for (const neighbor of getSurroundingCells(
                    currentCell.row,
                    currentCell.column
                ).filter((x) => !x.bomb)) {
                    if (visited.has(`${neighbor.row},${neighbor.column}`))
                        continue;
                    cellsToAttemptToExpand.push(neighbor);
                    visited.add(`${neighbor.row},${neighbor.column}`);
                }
            }

            currentCell.status = "open";
        }

        setGrid([...grid]);
    }

    function rightClickCell(e: React.MouseEvent<HTMLDivElement>, cell: Node) {
        e.preventDefault();
        switch (cell.status) {
            case "flagged":
                cell.status = "untouched";
                break;
            case "open":
                return;
            case "untouched":
                cell.status = "flagged";
                break;
        }

        setGrid([...grid]);
    }

    return (
        <div style={{ display: "flex", gap: 2, flexDirection: "column" }}>
            <div style={{ display: "flex", gap: 4 }}>
                <strong>
                    Bombs:{" "}
                    {bombs -
                        _.chain(grid)
                            .flatten()
                            .sumBy((x) => (x.status === "flagged" ? 1 : 0))
                            .value()}
                </strong>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
                {grid.map((row, i) => (
                    <div
                        key={i}
                        style={{ display: "flex", flexDirection: "row" }}
                    >
                        {row.map((cell) => (
                            <div
                                key={cell.column}
                                className={classNames(
                                    "cell",
                                    cell.status === "open"
                                        ? "cell-open"
                                        : "cell-not-open"
                                )}
                                style={{
                                    boxShadow: "inset #0000aa 0 0 0px 3px",
                                    width: "30px",
                                    height: "30px",
                                    display: "flex",
                                    justifyContent: "center",
                                    lineHeight: "30px",
                                }}
                                onClick={(e) => clickCell(e, cell)}
                                onContextMenu={(e) => rightClickCell(e, cell)}
                            >
                                {cell.status === "open" ? (
                                    cell.bomb ? (
                                        "💣"
                                    ) : countSurroundingBombs(
                                          cell.row,
                                          cell.column
                                      ) > 0 ? (
                                        countSurroundingBombs(
                                            cell.row,
                                            cell.column
                                        )
                                    ) : (
                                        ""
                                    )
                                ) : cell.status === "flagged" ? (
                                    <span style={{ color: "red" }}>⚑</span>
                                ) : (
                                    ""
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
            <div style={{ display: "flex", gap: 2 }}>
                <button
                    onClick={() => {
                        setBombs(10);
                        setWidth(10);
                        setHeight(10);
                        populateGrid();
                    }}
                >
                    Easy
                </button>
                <button
                    onClick={() => {
                        setBombs(40);
                        setWidth(15);
                        setHeight(15);
                        populateGrid();
                    }}
                >
                    Medium
                </button>
                <button
                    onClick={() => {
                        setBombs(150);
                        setWidth(25);
                        setHeight(25);
                        populateGrid();
                    }}
                >
                    Hard
                </button>
                <button
                    onClick={() => {
                        setBombs(5000);
                        setWidth(100);
                        setHeight(100);
                        populateGrid();
                    }}
                >
                    Impossible
                </button>
                <button onClick={() => populateGrid()}>Reset</button>
            </div>
        </div>
    );
}
