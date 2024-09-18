import "./main.css";

import classNames from "classnames";
import _ from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import Button from "./Button";

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
    const [status, setStatus] = useState<"in progress" | "dead" | "won">(
        "in progress"
    );
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

        setStatus("in progress");
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
            setStatus("dead");
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

        checkWin();
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

        checkWin();
        setGrid([...grid]);
    }

    function checkWin() {
        for (const cell of grid.flat()) {
            if (cell.bomb && cell.status !== "flagged") return;
        }

        // All bombs are flagged
        for (const cell of grid.flat()) {
            if (!cell.bomb) {
                cell.status = "open";
            }
        }

        setGrid([...grid]);
        setStatus("won");
        alert("You won!");
    }

    function solve() {
        let pendingStage1SolverRun = true;
        while (pendingStage1SolverRun) {
            pendingStage1SolverRun = false;
            for (const cell of grid.flat().filter(x => x.status === "open")) {
                const surroundingBombs = countSurroundingBombs(cell.row, cell.column);
                const unopenedSurroundingCells = getSurroundingCells(cell.row, cell.column).filter(x => x.status !== "open")
                const flaggedSurroundingCells = unopenedSurroundingCells.filter(x => x.status === "flagged");
                const remainingSurroundingBombs = surroundingBombs - flaggedSurroundingCells.length;
                const unflaggedSurroundingCells = unopenedSurroundingCells.filter(x => x.status === "untouched");
    
                if (remainingSurroundingBombs === unflaggedSurroundingCells.length) {
                    // If the number of surrounding bombs (factoring in flagged cells) is equal to the number of surrounding untouched cells, flag all those cells.
                    for (const cellToFlag of unflaggedSurroundingCells) {
                        cellToFlag.status = "flagged";
                        pendingStage1SolverRun = true;
                    }
                } else if (remainingSurroundingBombs === 0) {
                    // If there are no surrounding bombs (factoring in flagged cells), open all surrounding cells.
                    for (const cellToOpen of unflaggedSurroundingCells) {
                        cellToOpen.status = "open";
                        pendingStage1SolverRun = true;
                    }
                }
            }
        }

        setGrid([...grid]);
    }

    return (
        <div className="flex justify-center">
            <div className="flex gap-2 flex-col items-center">
                <div className="flex gap-4">
                    <strong>
                        Bombs:{" "}
                        {bombs -
                            _.chain(grid)
                                .flatten()
                                .sumBy((x) => (x.status === "flagged" ? 1 : 0))
                                .value()}
                    </strong>
                </div>
                <div className="flex flex-col">
                    {grid.map((row, i) => (
                        <div key={i} className="flex flex-row">
                            {row.map((cell) => (
                                <div
                                    key={cell.column}
                                    className={classNames(
                                        "select-none border-gray-700 border",
                                        cell.status === "open"
                                            ? cell.bomb
                                                ? "bg-red-500"
                                                : "bg-gray-300"
                                            : classNames(
                                                  "bg-gray-500",
                                                  status === "in progress" &&
                                                      "hover:bg-gray-600 cursor-pointer"
                                              )
                                    )}
                                    style={{
                                        width: "30px",
                                        height: "30px",
                                        display: "flex",
                                        justifyContent: "center",
                                        lineHeight: "30px",
                                    }}
                                    onClick={(e) => clickCell(e, cell)}
                                    onContextMenu={(e) =>
                                        rightClickCell(e, cell)
                                    }
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
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            setBombs(10);
                            setWidth(10);
                            setHeight(10);
                            populateGrid();
                        }}
                    >
                        Easy
                    </Button>
                    <Button
                        onClick={() => {
                            setBombs(40);
                            setWidth(15);
                            setHeight(15);
                            populateGrid();
                        }}
                    >
                        Medium
                    </Button>
                    <Button
                        onClick={() => {
                            setBombs(150);
                            setWidth(25);
                            setHeight(25);
                            populateGrid();
                        }}
                    >
                        Hard
                    </Button>
                    <Button
                        onClick={() => {
                            setBombs(5000);
                            setWidth(100);
                            setHeight(100);
                            populateGrid();
                        }}
                    >
                        Impossible
                    </Button>
                    <Button onClick={() => populateGrid()}>Reset</Button>
                    <Button onClick={() => solve()}>Solve</Button>
                </div>
            </div>
        </div>
    );
}
