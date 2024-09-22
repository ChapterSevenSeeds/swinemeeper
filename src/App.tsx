import "./main.css";

import { isMobile } from "react-device-detect";
import classNames from "classnames";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Button from "./Button";
import { useLongPress } from "use-long-press";
import { StopwatchResult } from "react-timer-hook";
import Timer from "./Timer";
import Board, { Cell } from "./Board";
import { runSolver } from "./solver";

export default function App() {
    const rerender = useReducer((x) => x + 1, 0)[1];
    const [width, setWidth] = useState(10);
    const [height, setHeight] = useState(10);
    const [numberOfBombs, setNumberOfBombs] = useState(10);
    const [status, setStatus] = useState<
        "not started" | "in progress" | "dead" | "won"
    >("not started");
    const board = useRef(new Board(width, height));
    const pendingIgnoreClickAfterLongPress = useRef(false);
    const stopwatchRef = useRef<StopwatchResult | null>(null);
    const bind = useLongPress(
        !isMobile
            ? null
            : (x) => {
                  pendingIgnoreClickAfterLongPress.current = true;
                  const targetDiv = x.target as HTMLDivElement;
                  const cellId = targetDiv.id;
                  const targetCell = board.current.getCellById(cellId);

                  if (!targetCell) return;

                  rightClickCell(targetCell);
              },
        {
            threshold: 400,
            cancelOnMovement: true,
        }
    );
    const longPressHandlers = bind("what");

    const populateGrid = useCallback(() => {
        setStatus("not started");
        board.current = new Board(width, height);
        board.current.reset();
        stopwatchRef.current?.reset();
        rerender();
    }, [height, rerender, width]);

    useEffect(() => {
        populateGrid();
    }, [populateGrid]);

    function clickCell(e: React.MouseEvent<HTMLDivElement>, cell: Cell) {
        if (pendingIgnoreClickAfterLongPress.current) {
            pendingIgnoreClickAfterLongPress.current = false;
            return;
        }

        if (status === "dead" || status === "won") return;

        if (status === "not started") {
            // Populate bombs
            board.current.placeBombs(cell, numberOfBombs);

            stopwatchRef.current?.start();
            setStatus("in progress");
        }

        if (cell.status === "flagged") {
            rightClickCell(cell);
            return;
        } else if (cell.isBomb) {
            stopwatchRef.current?.pause();
            alert("You died");
            setStatus("dead");
            board.current.unveilAllBombs();
            rerender();
            return;
        }

        cell.markAsOpen();

        board.current.tryExpandSurroundingCells(cell, status === "in progress");

        checkWin();
        rerender();
    }

    function onRightClickCell(e: React.MouseEvent<HTMLDivElement>, cell: Cell) {
        e.preventDefault();
        if (pendingIgnoreClickAfterLongPress.current) {
            pendingIgnoreClickAfterLongPress.current = false;
            return;
        }
        rightClickCell(cell);
    }

    function rightClickCell(cell: Cell) {
        if (status !== "in progress") return;

        cell.toggleFlagged();

        checkWin();
        rerender();
    }

    function checkWin() {
        if (!board.current.isBoardCleared) return;

        board.current.openAllNonBombCells();

        setStatus("won");
        alert("You won!");
        stopwatchRef.current?.pause();
    }

    function solve() {
        runSolver(board.current);
        checkWin();

        rerender();
    }

    return (
        <div className="flex justify-center">
            <div className="flex gap-2 flex-col items-center">
                <div className="flex gap-4 justify-between w-full">
                    <strong>
                        Bombs: {board.current.numberOfBombsMinusNumberOfFlags}
                    </strong>
                    <Timer timerRef={stopwatchRef} />
                </div>
                <div className="max-w-[100vw] max-h-[calc(100vh_-_100px)] overflow-auto">
                    <div
                        className="flex flex-col"
                        style={{
                            width: `${width * 31}px`,
                            height: `${height * 31}px`,
                        }}
                    >
                        {board.current.board.map((row, rowIndex) => (
                            <div key={rowIndex} className="flex flex-row">
                                {row.map((cell) => (
                                    <div
                                        key={cell.id}
                                        className={classNames(
                                            "select-none border-gray-700 border",
                                            cell.status === "open"
                                                ? cell.isBomb
                                                    ? "bg-red-500"
                                                    : "bg-gray-300"
                                                : classNames(
                                                      "bg-gray-500",
                                                      (status ===
                                                          "in progress" ||
                                                          status ===
                                                              "not started") &&
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
                                        id={cell.id}
                                        onClick={(e) => clickCell(e, cell)}
                                        onContextMenu={(e) =>
                                            onRightClickCell(e, cell)
                                        }
                                        {...longPressHandlers}
                                    >
                                        {cell.status === "open" ? (
                                            cell.isBomb ? (
                                                "💣"
                                            ) : board.current.countSurroundingBombsFromNode(
                                                  cell
                                              ) > 0 ? (
                                                board.current.countSurroundingBombsFromNode(
                                                    cell
                                                )
                                            ) : (
                                                ""
                                            )
                                        ) : cell.status === "flagged" ? (
                                            <span style={{ color: "red" }}>
                                                ⚑
                                            </span>
                                        ) : (
                                            ""
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            setNumberOfBombs(10);
                            setWidth(10);
                            setHeight(10);
                            populateGrid();
                        }}
                    >
                        Easy
                    </Button>
                    <Button
                        onClick={() => {
                            setNumberOfBombs(40);
                            setWidth(15);
                            setHeight(15);
                            populateGrid();
                        }}
                    >
                        Medium
                    </Button>
                    <Button
                        onClick={() => {
                            setNumberOfBombs(150);
                            setWidth(25);
                            setHeight(25);
                            populateGrid();
                        }}
                    >
                        Hard
                    </Button>
                    <Button
                        onClick={() => {
                            setNumberOfBombs(5000);
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
