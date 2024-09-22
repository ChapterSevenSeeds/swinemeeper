import _ from "lodash";
import { v4 } from "uuid";

export type NodeStatus = "untouched" | "flagged" | "open";

export class Cell {
    public readonly row: number;
    public readonly column: number;
    public readonly id: string;

    private _isBombSet = false;
    private _isBomb = false;
    public get isBomb() {
        return this._isBomb;
    }

    public sealBombStatus(isBomb: boolean) {
        if (this._isBombSet) {
            throw new Error("Bomb status is sealed");
        }

        this._isBombSet = true;
        this._isBomb = isBomb;
    }

    private _status: NodeStatus;
    public get status() {
        return this._status;
    }

    public constructor(row: number, column: number, id: string) {
        this.row = row;
        this.column = column;
        this.id = id;

        this._status = "untouched";
    }

    public toggleFlagged() {
        switch (this._status) {
            case "flagged":
                this._status = "untouched";
                break;
            case "untouched":
                this._status = "flagged";
                break;
        }
    }

    public changeFlaggedState(flagged: boolean) {
        if (this.status === "open") return;

        if (flagged) {
            this._status = "flagged";
        } else {
            this._status = "untouched";
        }
    }

    public markAsOpen() {
        this._status = "open";
    }
}

function iterateCoordinates(rows: number, columns: number) {
    const result: { row: number; column: number }[] = [];
    for (let row = 0; row < rows; ++row) {
        for (let column = 0; column < columns; ++column) {
            result.push({ row, column });
        }
    }

    return result;
}

export default class Board {
    public readonly width: number;
    public readonly height: number;

    private _bombsPlaced = false;
    public get bombsPlaced() {
        return this._bombsPlaced;
    }

    public get isBoardCleared() {
        return this.board
            .flat()
            .every(
                (x) =>
                    (x.isBomb && x.status === "flagged") ||
                    (!x.isBomb &&
                        (x.status === "open" || x.status === "untouched"))
            );
    }

    public get boardFlat() {
        return this.board.flat();
    }

    public get allOpenCells() {
        return this.boardFlat.filter((x) => x.status === "open");
    }

    public get numberOfBombsMinusNumberOfFlags() {
        return (
            _.sumBy(this.boardFlat, (x) => (x.isBomb ? 1 : 0)) -
            _.sumBy(this.boardFlat, (x) => (x.status === "flagged" ? 1 : 0))
        );
    }

    public readonly board: Cell[][] = [];

    public constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }

    public reset() {
        this._bombsPlaced = false;
        this.board.splice(0);
        for (let row = 0; row < this.height; ++row) {
            const rowObj: Cell[] = [];
            for (let column = 0; column < this.width; ++column) {
                rowObj.push(new Cell(row, column, v4()));
            }
            this.board.push(rowObj);
        }
    }

    public placeBombs(focusCell: Cell, numberOfBombs: number) {
        if (this._bombsPlaced)
            throw new Error("Bombs have already been placed");

        this._bombsPlaced = true;
        const surroundingCellCoordinates = new Set<string>(
            this.getSurroundingCellsFromNode(focusCell).map((x) => x.id)
        );
        const cellIdsToMarkAsBombs = new Set(
            _.chain(iterateCoordinates(this.height, this.width))
                .filter(
                    (x) =>
                        x.column !== focusCell.column &&
                        x.row !== focusCell.row &&
                        !surroundingCellCoordinates.has(
                            this.board[x.row][x.column].id
                        )
                )
                .sampleSize(numberOfBombs)
                .map((x) => this.board[x.row][x.column].id)
                .value()
        );

        for (const cell of this.board.flat()) {
            cell.sealBombStatus(cellIdsToMarkAsBombs.has(cell.id));
        }
    }

    public getSurroundingCellsFromNode(cell: Cell): Cell[] {
        return this.getSurroundingCells(cell.row, cell.column);
    }

    public getSurroundingCells(row: number, column: number): Cell[] {
        const cells: Cell[] = [];
        for (const rowOffset of [-1, 0, 1]) {
            for (const columnOffset of [-1, 0, 1]) {
                if (rowOffset === 0 && columnOffset === 0) continue;

                const newRow = row + rowOffset;
                const newColumn = column + columnOffset;

                if (newRow < 0 || newRow >= this.height) continue;
                if (newColumn < 0 || newColumn >= this.width) continue;

                cells.push(this.board[newRow][newColumn]);
            }
        }

        return cells;
    }

    public getSurroundingNonBombCells(cell: Cell) {
        return this.getSurroundingCellsFromNode(cell).filter((x) => !x.isBomb);
    }

    public countSurroundingBombsFromNode(cell: Cell) {
        return this.countSurroundingBombs(cell.row, cell.column);
    }

    public countSurroundingBombs(row: number, column: number) {
        return this.getSurroundingCells(row, column).filter((x) => x.isBomb)
            .length;
    }

    public unveilAllBombs() {
        for (const cell of this.board.flat().filter((x) => x.isBomb)) {
            cell.markAsOpen();
        }
    }

    public tryExpandSurroundingCells(
        focusCell: Cell,
        restrictToCellsSurroundedByZeroBombs: boolean
    ) {
        const visited: Set<string> = new Set([focusCell.id]);
        let cellsToAttemptToExpand: Cell[] =
            this.getSurroundingNonBombCells(focusCell);
        if (restrictToCellsSurroundedByZeroBombs) {
            cellsToAttemptToExpand = cellsToAttemptToExpand.filter(
                (x) => this.countSurroundingBombsFromNode(x) === 0
            );
        }
        for (const toExpand of cellsToAttemptToExpand) {
            visited.add(toExpand.id);
        }
        while (cellsToAttemptToExpand.length > 0) {
            const currentCell = cellsToAttemptToExpand.shift()!;
            const surroundingBombs =
                this.countSurroundingBombsFromNode(currentCell);
            if (surroundingBombs === 0) {
                for (const neighbor of this.getSurroundingNonBombCells(
                    currentCell
                )) {
                    if (visited.has(neighbor.id)) continue;
                    cellsToAttemptToExpand.push(neighbor);
                    visited.add(neighbor.id);
                }
            }

            currentCell.markAsOpen();
        }
    }

    public openAllNonBombCells() {
        for (const cell of this.board.flat().filter((x) => !x.isBomb)) {
            cell.markAsOpen();
        }
    }

    public getCellById(id: string) {
        return this.boardFlat.find((x) => x.id === id);
    }
}
