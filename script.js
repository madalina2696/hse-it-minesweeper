window.addEventListener('load', async () => await minesweeper.init(), console.error);

const minesweeper = {
    gametypes: [
        { name: 'Small', size: 9, mines: 10 },
        { name: 'Medium', size: 16, mines: 40 },
        { name: 'Large', size: 24, mines: 150 }
    ],
    gameover: false,
    async init() {
        this.logic = localLogic;
        await this.generateBlocks();
        await this.newGame('Small');
    },
    async generateBlocks() {
        document.getElementById('game-s').addEventListener('click', async () => await this.newGame('Small'));
        document.getElementById('game-m').addEventListener('click', async () => await this.newGame('Medium'));
        document.getElementById('game-l').addEventListener('click', async () => await this.newGame('Large'));
    },
    async fillPlayfield() {
        const playfield = document.getElementById('playfield');
        playfield.innerHTML = '';
        const size = this.size;

        playfield.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        playfield.style.gridTemplateRows = `repeat(${size}, 1fr)`;

        for (let row = 0; row < size; row++) {
            for (let column = 0; column < size; column++) {
                const cell = await this.generateCell(row, column);
                playfield.appendChild(cell);
            }
        }

        playfield.addEventListener('mouseenter', () => {
            if (this.gameover) {
                document.querySelector('.overlay').style.display = 'flex';
            }
        });

        playfield.addEventListener('mouseleave', () => {
            if (this.gameover) {
                document.querySelector('.overlay').style.display = 'none';
            }
        });
    },
    async generateCell(row, column) {
        const cell = document.createElement('div');
        cell.classList.add('cell', 'covered');
        cell.dataset.x = row;
        cell.dataset.y = column;

        cell.addEventListener('click', async (event) => await this.cellClicked(event));
        cell.addEventListener('contextmenu', async (event) => await this.cellRightClick(event));
        cell.addEventListener('touchstart', async (event) => await this.touchStart(event));
        cell.addEventListener('touchend', async (event) => await this.touchEnd(event));
        return cell;
    },
    async newGame(gametype) {
        this.gameover = false;
        for (const type of this.gametypes) {
            if (type.name === gametype) {
                this.size = type.size;
                this.mines = type.mines;
            }
        }
        await this.fillPlayfield();
        await this.logic.init(this.size, this.mines);
    },
    getCell(x, y) {
        return document.querySelector(`[data-x="${x}"][data-y="${y}"]`);
    },
    async placeSymbol(x, y, symbol, mineHit) {
        const cell = this.getCell(x, y);
        cell.classList.remove('covered', 'flag');

        if (symbol) {
            cell.classList.add('symbol', symbol);
        }
        if (mineHit) {
            if (mineHit.minesAround) {
                cell.classList.add('symbol', 's' + mineHit.minesAround);
            } else {
                cell.classList.add('symbol', 'emptySymbol');
            }
        }
    },
    async cellClicked(event) {
        if (this.gameover) return;

        const x = parseInt(event.target.dataset.x);
        const y = parseInt(event.target.dataset.y);
        event.preventDefault();
        const cell = this.getCell(x, y);

        // Remove flag if present
        if (cell.classList.contains('flag')) {
            cell.classList.remove('flag');
        } else {
            const mineHit = await this.logic.sweep(x, y);

            console.log('Clicked cell at:', x, y, 'mineHit:', mineHit);

            if (mineHit.mineHit) {
                console.log('Mine was hit at:', x, y);
                this.displayOverlay('You lose!');
                this.gameover = true;
                event.target.classList.add('minehit');
                await this.placeSymbol(x, y, 'mine');

                mineHit.mines.forEach(async mine => {
                    await this.placeSymbol(mine.x, mine.y, 'mine');
                });
            } else {
                console.log('No mine hit at:', x, y);  // Debug statement
                await this.placeSymbol(x, y, null, mineHit);
                if (mineHit.emptyCells) {
                    mineHit.emptyCells.forEach(async cell => await this.placeSymbol(cell.x, cell.y, null, cell));
                }
                if (mineHit.userWins) {
                    this.displayOverlay('You win!');
                    this.gameover = true;
                }
            }
        }
    },
    async cellRightClick(event) {
        if (this.gameover) return;

        const x = event.target.dataset.x;
        const y = event.target.dataset.y;
        event.preventDefault();
        const cell = this.getCell(x, y);
        cell.classList.toggle('flag');
    },
    async touchStart(event) {
        this.startMillisec = new Date().getTime();
        event.preventDefault();
    },
    async touchEnd(event) {
        const endMillisec = new Date().getTime() - this.startMillisec;
        if (endMillisec < 500) {
            await this.cellClicked(event);
        } else {
            await this.cellRightClick(event);
        }
    },
    displayOverlay(text) {
        let overlay = document.querySelector('.overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.classList.add('overlay');

            const textHolder = document.createElement('div');
            textHolder.classList.add('overlay-text');
            textHolder.innerText = text;

            overlay.appendChild(textHolder);
            document.body.appendChild(overlay);
        } else {
            overlay.querySelector('.overlay-text').innerText = text;
            overlay.style.display = 'flex';
        }
    }
};

const localLogic = {
    moveCounter: 0,
    async init(size, mines) {
        this.field = [];
        this.size = size;
        this.mines = mines;
        this.moveCounter = 0;
        this.uncoveredCells = [];

        for (let rowIndex = 0; rowIndex < size; rowIndex++) {
            let row = [];
            let uncoveredRow = [];
            for (let colIndex = 0; colIndex < size; colIndex++) {
                row.push(false);
                uncoveredRow.push(false);
            }
            this.field.push(row);
            this.uncoveredCells.push(uncoveredRow);
        }
        console.dir(this.field);
    },
    async placeSingleMine(x, y) {
        while (true) {
            const tryX = Math.floor(Math.random() * this.size);
            const tryY = Math.floor(Math.random() * this.size);

            if (tryX === x && tryY === y) continue;
            if (this.field[tryX][tryY]) continue;
            this.field[tryX][tryY] = true;
            return;
        }
    },
    async placeMines(x, y) {
        for (let i = 0; i < this.mines; i++) {
            await this.placeSingleMine(x, y);
        }
    },
    async sweep(x, y) {
        x = parseInt(x);
        y = parseInt(y);
        if (this.moveCounter === 0) {
            await this.placeMines(x, y);
        }
        this.moveCounter++;

        const mineHit = this.field[x][y];
        if (mineHit) {
            console.log('Mine hit:', { x, y }); // Debug statement
            return { mineHit: true, mines: await this.collectMines() };
        } else {
            const minesAround = await this.countMinesAround(x, y);
            const emptyCells = minesAround > 0 ? undefined : await this.getEmptyCells(x, y);

            this.uncoveredCells[x][y] = true;
            if (emptyCells) {
                emptyCells.forEach(cell => {
                    this.uncoveredCells[cell.x][cell.y] = true;
                });
            }

            const uncoveredCount = await this.countUncoveredCells();
            const totalCells = this.size * this.size;
            const mineCount = this.mines;

            if (uncoveredCount === (totalCells - mineCount)) {
                // User wins if all non-mine cells are uncovered
                return { mineHit: false, minesAround, emptyCells, userWins: true };
            } else {
                return { mineHit: false, minesAround, emptyCells };
            }
        }
    },
    async collectMines() {
        const mineCollection = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.field[row][col]) {
                    mineCollection.push({ x: col, y: row });
                }
            }
        }
        return mineCollection;
    },
    async countUncoveredCells() {
        let count = 0;
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.uncoveredCells[row][col]) {
                    count++;
                }
            }
        }
        return count;
    },
    async countMinesAround(x, y) {
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    if (this.field[nx][ny]) {
                        count++;
                    }
                }
            }
        }
        return count;
    },
    getSafe(x, y) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) {
            return undefined;
        }
        return this.field[x][y];
    },
    async getNeighbors(x, y) {
        const neighbors = [];
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const cell = this.getSafe(x + dx, y + dy);
                if (cell === false) {
                    const minesAround = await this.countMinesAround(x + dx, y + dy);
                    neighbors.push({ x: x + dx, y: y + dy, minesAround });
                }
            }
        }
        return neighbors;
    },
    async getEmptyCells(x, y) {
        const toDo = [{ x, y, minesAround: 0 }];
        const done = [];

        while (toDo.length) {
            const actual = toDo.shift();
            done.push(actual);
            const neighbors = await this.getNeighbors(actual.x, actual.y);
            for (const neighbor of neighbors) {
                if (this.inList(done, neighbor)) continue;

                if (neighbor.minesAround) {
                    done.push(neighbor);
                    continue;
                }
                if (!this.inList(toDo, neighbor)) {
                    toDo.push(neighbor);
                }
            }
        }
        return done;
    },
    inList(list, element) {
        return list.some(singleElement => singleElement.x === element.x && singleElement.y === element.y);
    }
};
