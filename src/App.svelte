<script lang="ts">
	import Router from 'svelte-spa-router';
	import {link} from 'svelte-spa-router'
	import QuboFormulation from './QuboFormulation.svelte';	
	import QuboIsingModel from './QuboIsingModel.svelte';

	const routes = {
		'/': QuboIsingModel,
		"/formulation": QuboFormulation
	}
</script>

<nav>
	<a href="/" use:link>イジンングモデルを学ぼう</a>
	<a href="/formulation" use:link>定式化</a>
</nav>
<Router {routes}/>

<style>
	nav {
		margin : 0;
		padding: 0;
		font-size: 1.5rem;
	}

</style>