import { Universe } from 'wasm-game-of-life';
import { memory } from 'wasm-game-of-life/wasm_game_of_life_bg';

const query = new URLSearchParams(window.location.search);
const renderEmpty = query.has('empty');

const CELL_SIZE = 5; // px
const GRID_COLOR = "#CCCCCC";
const DEAD_COLOR = "#FFFFFF";
const ALIVE_COLOR = "#000000";

const universe = Universe.new(renderEmpty);
const width = universe.width();
const height = universe.height();

const canvas = document.getElementById('game-of-life-canvas');
const toggle = document.getElementById('play-pause');

canvas.height = (CELL_SIZE + 1) * height + 1;
canvas.width = (CELL_SIZE + 1) * width + 1;

const ctx = canvas.getContext('2d');
let animationId = null;

const fps = new class {
	constructor() {
		this.fps = document.getElementById('fps');
		this.frames = [];
		this.lastFrameTimeStamp = performance.now();
	}

	render() {
		const now = performance.now();
		const delta = now - this.lastFrameTimeStamp;
		
		this.lastFrameTimeStamp = now;

		const fps = 1 / delta * 1000;
		this.frames.push(fps);

		if (this.frames.length > 100) {
			this.frames.shift();
		}

		let min = Infinity;
		let max = -Infinity;
		let sum = 0;

		for (let i = 0; i < this.frames.length; i++) {
			sum += this.frames[i];
			min = Math.min(this.frames[i], min);
			max = Math.max(this.frames[i], max);
		}

		const mean = sum / this.frames.length;
		this.fps.textContent = `
Frames per Second:
       
latest = ${Math.round(fps)}
avg of last 100 = ${Math.round(mean)}
min of last 100 = ${Math.round(min)}
max of last 100 = ${Math.round(max)}
`.trim();
	}
};

function renderLoop() {
	fps.render();

	universe.tick();

	drawGrid();
	drawCells();

	animationId = requestAnimationFrame(renderLoop);
}

function isPaused() {
	return animationId === null;
}

function play() {
	toggle.textContent = "⏸";
	renderLoop();
}

function pause() {
	toggle.textContent = "▶";
	cancelAnimationFrame(animationId);
	animationId = null;
}

toggle.addEventListener('click', () => {
	if (isPaused()) {
		play();
	} else {
		pause();
	}
});

canvas.addEventListener('click', (event) => {
	const boundingRect = canvas.getBoundingClientRect();

	const scaleX = canvas.width / boundingRect.width;
	const scaleY = canvas.height / boundingRect.height;

	const canvasLeft = (event.clientX - boundingRect.left) * scaleX;
	const canvasTop = (event.clientY - boundingRect.top) * scaleY;

	const row = Math.min(Math.floor(canvasTop / (CELL_SIZE + 1)), height - 1);
	const col = Math.min(Math.floor(canvasLeft / (CELL_SIZE + 1)), width - 1);

	if (event.ctrlKey) {
		universe.insertGlider(row, col);
	} else {
		universe.toggleCell(row, col);
	}
	drawGrid();
	drawCells();
});

function drawGrid() {
	ctx.beginPath();
	ctx.strokeStyle = GRID_COLOR;

	// Vertical lines.
	for (let i = 0; i <= width; i++) {
		ctx.moveTo(i * (CELL_SIZE + 1) + 1, 0);
		ctx.lineTo(i * (CELL_SIZE + 1) + 1, (CELL_SIZE + 1) * height + 1);
	}

	// Horizontal lines.
	for (let j = 0; j <= height; j++) {
		ctx.moveTo(0,                           j * (CELL_SIZE + 1) + 1);
		ctx.lineTo((CELL_SIZE + 1) * width + 1, j * (CELL_SIZE + 1) + 1);
	}

	ctx.stroke();
}

function drawCells() {
	const cellsPtr = universe.cells();
	const cells = new Uint8Array(memory.buffer, cellsPtr, width * height / 8);

	ctx.beginPath();

	// Alive cells.
	ctx.fillStyle = ALIVE_COLOR;
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			const idx = getIndex(row, col);
			if (!bitIsSet(idx, cells)) {
				continue;
			}

			ctx.fillRect(
				col * (CELL_SIZE + 1) + 1,
				row * (CELL_SIZE + 1) + 1,
				CELL_SIZE,
				CELL_SIZE
			);
		}
	}

	// Dead cells.
	ctx.fillStyle = DEAD_COLOR;
	for (let row = 0; row < height; row++) {
		for (let col = 0; col < width; col++) {
			const idx = getIndex(row, col);
			if (bitIsSet(idx, cells)) {
				continue;
			}

			ctx.fillRect(
				col * (CELL_SIZE + 1) + 1,
				row * (CELL_SIZE + 1) + 1,
				CELL_SIZE,
				CELL_SIZE
			);
		}
	}

	ctx.stroke();
}

function getIndex(row, column) {
	return row * width + column;
}

function bitIsSet(n, arr) {
	const byte = Math.floor(n / 8);
	const mask = 1 << (n % 8);
	return (arr[byte] & mask) === mask;
}

drawGrid();
drawCells();
query.has('pause') ? pause() : play();
