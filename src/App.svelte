<script lang="ts">
	let dragVertex: Vertex;
	let dragNewVertexPos: Position;
	let selected: Vertex | Edge;
	let edgeMode = false;
	let edgeStartVertex: Vertex;
	let edgeEndVertexPos: Position;
	let selectedInspectorTab: "vertex" | "edge" = "vertex";
	type Position = [number, number];

	class Edge {
		vertices: [Vertex, Vertex];
		weight: number;

		constructor(vertices: [Vertex, Vertex], weight: number = 0) {
			this.vertices = vertices;
			this.weight = weight;
		}

		get x1(): number {
			return this.vertices[0].position[0];
		}

		get y1(): number {
			return this.vertices[0].position[1];
		}

		get x2(): number {
			return this.vertices[1].position[0];
		}

		get y2(): number {
			return this.vertices[1].position[1];
		}

		get centerX(): number {
			return (this.x1 + this.x2) / 2;
		}

		get centerY(): number {
			return (this.y1 + this.y2) / 2;
		}

		get name(): string {
			return `q${this.vertices[0].index},q${this.vertices[1].index}`;
		}
	}

	type Vertex = {
		index: number;
		value: 1 | 0;
		weight: number;
		position: Position;
	};

	type Vertices = Vertex[];
	type Edges = Edge[];

	class Graph {
		vertices: Vertices = [];
		edges: Edges = [];
		lastIndex: number = 0;

		constructor() {}

		addVertex(
			position: Position,
			weight: number = 0,
			value: 0 | 1 = 0
		): Vertex {
			const vertex: Vertex = {
				index: this.lastIndex,
				position,
				weight,
				value,
			};
			this.vertices.push(vertex);
			this.lastIndex++;
			return vertex;
		}

		addEdge(vertices: [Vertex, Vertex], weight: number = 0): Edge {
			const [v1, v2] = vertices;
			if (v1 === v2) {
				return;
			}
			const newVertices: [Vertex, Vertex] =
				v1.index < v2.index ? vertices : [v2, v1];
			if (
				this.edges.find(
					(edge) => edge.vertices[0] === v1 && edge.vertices[1] === v2
				)
			) {
				return;
			}

			const edge: Edge = new Edge(newVertices, weight);
			this.edges.push(edge);
			return edge;
		}

		calulate(): number {
			let result = 0;

			result += graph.vertices
				.map((vertex) => vertex.value * vertex.weight)
				.reduce((a, b) => a + b, 0);

			result += graph.edges
				.map(
					(edge) =>
						edge.weight *
						edge.vertices[0].value *
						edge.vertices[1].value
				)
				.reduce((a, b) => a + b, 0);

			return result;
		}

		calculateMin() {
			let count = 2 ** this.vertices.length;
			let min;
			let verticesNumber;
			for (let i = 0; i < count; i++) {
				for (let n = 0; n < this.vertices.length; n++) {
					this.vertices[n].value = ((i >> n) & 1) as 0 | 1;
				}
				const result = this.calulate();
				if (min === undefined || min > result) {
					min = result;
					verticesNumber = i;
				}
			}

			for (let n = 0; n < this.vertices.length; n++) {
				this.vertices[n].value = ((verticesNumber >> n) & 1) as 0 | 1;
			}

			return min;
		}
	}

	let graph = new Graph();

	function dragStart(e, vertex: Vertex) {
		if (e.shiftKey) {
			edgeMode = true;
			edgeStartVertex = vertex;
			edgeEndVertexPos = [e.offsetX, e.offsetY];
			return;
		}
		dragVertex = vertex;
		selected = vertex;
	}

	function drag(e: MouseEvent) {
		if (dragVertex) {
			dragVertex.position[0] = e.offsetX;
			dragVertex.position[1] = e.offsetY;
			graph = graph;
		} else if (dragNewVertexPos) {
			dragNewVertexPos[0] = e.offsetX;
			dragNewVertexPos[1] = e.offsetY;
		} else if (edgeMode) {
			edgeEndVertexPos[0] = e.offsetX;
			edgeEndVertexPos[1] = e.offsetY;
		}
	}

	function dragEnd(e: MouseEvent) {
		if (dragVertex) {
			dragVertex = undefined;
		} else if (dragNewVertexPos) {
			graph.addVertex(dragNewVertexPos);
			dragNewVertexPos = undefined;
			graph = graph;
		} else {
			edgeMode = false;
			edgeStartVertex = undefined;
		}
	}

	function inputVertexChange(e, target: Vertex | Edge) {
		const value = parseInt(e.target.value, 10);
		if (value > -100 && value < 100) {
			target.weight = value;
		} else if (value >= 100) {
			target.weight = 100;
		} else if (value <= -100) {
			target.weight = -100;
		}
		graph = graph;
	}

	function addNewVertexPos(e) {
		dragNewVertexPos = [e.offsetX, e.offsetY];
	}

	function addEdge(endVertex: Vertex) {
		if (edgeMode && edgeStartVertex) {
			graph.addEdge([edgeStartVertex, endVertex]);
			graph = graph;
		}
	}
</script>

	<h1>イジングマシンを学ぼう!</h1>
	<h2>つかいかた</h2>
	<p>
		<svg width="40" height="40">			
			<rect width="40" height="40" fill="#ffffff" stroke="black" />
			<circle cx="20" cy="20" r="15" fill="#ffffff" stroke="black" />
		</svg>
		この部品をドラッグしてみよう! 頂点が追加できるよ!
	</p>
	<p>
		辺を引くときは、頂点シフトキーを押しながら、ほかの頂点にドラッグすると辺を追加できるよ!
	</p>
	<p>
		右上のインスペクターから、頂点や辺に関する重みや、頂点のビットを変更できるよ!
	</p>
<main>
	<svg
		width="100%"
		height="100%"
		xmlns="http://www.w3.org/2000/svg"
		on:mousemove={drag}
		on:mouseup={dragEnd}
	>
		<g transform="translate(0,10)" on:mousedown={addNewVertexPos}>
			<rect width="80" height="80" fill="#ffffff" stroke="black" />
			<circle cx="40" cy="40" r="30" fill="#ffffff" stroke="black" />
		</g>

		{#if edgeMode}
			<line
				x1={edgeStartVertex.position[0]}
				y1={edgeStartVertex.position[1]}
				x2={edgeEndVertexPos[0]}
				y2={edgeEndVertexPos[1]}
				stroke="black"
			/>
		{/if}

		{#each graph.edges as edge}
			<line
				x1={edge.x1}
				y1={edge.y1}
				x2={edge.x2}
				y2={edge.y2}
				stroke="black"
			/>
			<g
				transform="translate({edge.centerX},{edge.centerY})"
				on:click={(e) => {
					selected = edge;
				}}
			>
				{#if selected === edge}
					<rect
						x="-30"
						y="-15"
						width="60"
						height="30"
						fill="#ffffff"
						stroke="orange"
					/>
				{:else}
					<rect
						x="-30"
						y="-15"
						width="60"
						height="30"
						fill="#ffffff"
						stroke="#000000"
					/>
				{/if}
				<text y="-30" text-anchor="middle" dominant-baseline="central"
					>{edge.name}</text
				>
				<text text-anchor="middle" dominant-baseline="central"
					>{edge.weight}</text
				>
			</g>
		{/each}
		{#each graph.vertices as vertex}
			<g
				on:mousedown={(e) => dragStart(e, vertex)}
				on:mouseup={(e) => {
					addEdge(vertex);
				}}
				transform="translate({vertex.position[0]},{vertex.position[1]})"
			>
				<circle
					cx="0"
					cy="0"
					r="30"
					fill={vertex.value === 0 ? "white" : "#99c0ff"}
					stroke={selected === vertex ? "orange" : "black"}
				/>

				<text y="-40" text-anchor="middle" dominant-baseline="central"
					>q{vertex.index}</text
				>
				<text text-anchor="middle" dominant-baseline="central"
					>{vertex.weight}</text
				>
			</g>
		{/each}

		{#if dragNewVertexPos}
			<circle
				cx={dragNewVertexPos[0]}
				cy={dragNewVertexPos[1]}
				r="30"
				fill="#ffffff"
				stroke="black"
			/>
		{/if}
	</svg>

	<div class="inspector">
		<div class="inspector-tab">
			<p
				class:not-selected={selectedInspectorTab !== "vertex"}
				on:click={(e) => {
					selectedInspectorTab = "vertex";
				}}
			>
				単独作用
			</p>
			<p
				class:not-selected={selectedInspectorTab !== "edge"}
				on:click={(e) => {
					selectedInspectorTab = "edge";
				}}
			>
				相互作用
			</p>
		</div>
		<div class="inspector-main">
			{#if selectedInspectorTab === "vertex"}
				<p>単独作用</p>
				<table>
					<thead>
						<th>Q</th>
						<th>重み</th>
						<th>ビット</th>
						<th>切り替え</th>
					</thead>
					<tbody>
						{#each graph.vertices as vertex}
							<tr
								class:selected={vertex === selected}
								on:click={(e) => {
									selected = vertex;
								}}
							>
								<td>q{vertex.index}</td>
								<td
									><input
										value={vertex.weight}
										on:input={(e) =>
											inputVertexChange(e, vertex)}
									/></td
								>
								<td>{vertex.value} </td>
								<td>
									<button
										on:click={(e) => {
											vertex.value =
												vertex.value === 0 ? 1 : 0;
											graph = graph;
										}}
										>{vertex.value === 0
											? 1
											: 0}にする</button
									>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			{:else if selectedInspectorTab === "edge"}
				<p>相互作用</p>
				<table>
					<thead>
						<th>Edge</th>
						<th>重み</th>
						<th>(A, B)</th>
						<th>(A × B)</th>
					</thead>
					<tbody>
						{#each graph.edges as edge}
							<tr
								class:selected={edge === selected}
								on:click={(e) => {
									selected = edge;
								}}
							>
								<td>{edge.name}</td>
								<td
									><input
										value={edge.weight}
										on:input={(e) =>
											inputVertexChange(e, edge)}
									/></td
								>
								<td
									>({edge.vertices[0].value},{edge.vertices[1]
										.value})</td
								>
								<td
									>{edge.vertices[0].value *
										edge.vertices[1].value}</td
								>
							</tr>
						{/each}
					</tbody>
				</table>
			{/if}
		</div>
	</div>

	<div class="result">
		<p>エネルギー合計</p>
		<p>{graph.calulate()}</p>
		<p>全探索数</p>
		<p>{2 ** graph.vertices.length}</p>
		<button
			on:click={(e)=>{
				graph.calculateMin();
				graph = graph;
			}}
		>最小のエネルギーを計算する</button>
	</div>
</main>

<style>
	svg {
		border: 1px solid black;
		grid-row: 1 / 3;
		grid-column: 1 / 2;
	}

	main {
		display: grid;
		grid-template-columns: 3fr 1fr;
		grid-template-rows: 1fr 1fr;
		height: 100%;
	}

	.inspector {
		border: 1px solid black;
		padding: 0;
	}

	table {
		width: 100%;
		text-align: center;
		border-collapse: collapse;
		border-spacing: 0;
	}

	.selected td {
		background-color: orange;
	}

	th {
		padding: 10px;
		background: #e9faf9;
		border: solid 1px #778ca3;
	}

	td {
		padding: 10px;
		border: solid 1px #778ca3;
	}

	.inspector-tab {
		display: flex;
		width: 100%;
	}

	.inspector-tab p {
		padding: 0.5rem;
		flex-grow: 1;
		border-right: 1px solid black;
		margin: 0;
	}

	.inspector-tab p.not-selected {
		border-bottom: 1px solid black;
	}

	.inspector-main {
		padding: 1rem;
	}

	.inspector input {
		width: 5rem;
	}

	.result {
		padding: 1rem;
		border: 1px solid black;
	}
</style>
