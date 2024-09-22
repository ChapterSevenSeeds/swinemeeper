import Board from "./Board";

export function runSolver(board: Board) {
    let pendingStage1SolverRun = true;
    while (pendingStage1SolverRun) {
        pendingStage1SolverRun = false;
        for (const cell of board.allOpenCells) {
            const surroundingBombs = board.countSurroundingBombsFromNode(cell);
            const unopenedSurroundingCells = board
                .getSurroundingCellsFromNode(cell)
                .filter((x) => x.status !== "open");
            const flaggedSurroundingCells = unopenedSurroundingCells.filter(
                (x) => x.status === "flagged"
            );
            const remainingSurroundingBombs =
                surroundingBombs - flaggedSurroundingCells.length;
            const unflaggedSurroundingCells = unopenedSurroundingCells.filter(
                (x) => x.status === "untouched"
            );

            if (
                remainingSurroundingBombs === unflaggedSurroundingCells.length
            ) {
                // If the number of surrounding bombs (factoring in flagged cells) is equal to the number of surrounding untouched cells, flag all those cells.
                for (const cellToFlag of unflaggedSurroundingCells) {
                    cellToFlag.changeFlaggedState(true);
                    pendingStage1SolverRun = true;
                }
            } else if (remainingSurroundingBombs === 0) {
                // If there are no surrounding bombs (factoring in flagged cells), open all surrounding cells.
                for (const cellToOpen of unflaggedSurroundingCells) {
                    cellToOpen.markAsOpen();
                    pendingStage1SolverRun = true;
                }
            }
        }
    }
}
