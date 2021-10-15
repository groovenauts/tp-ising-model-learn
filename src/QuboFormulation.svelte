<script lang="ts">
import { ObjectiveFunctions } from "./ObjectiveFunction";

    import {ResponseVariable} from "./ResponseVariable";

    let objectiveFunction = new ObjectiveFunctions();

    function startup() {
        objectiveFunction.addResponseVariable();
        objectiveFunction.addResponseVariable();
    }

    function ontermchange(e, term) {
        if (parseInt(e.target.value) > 1) {
            term.value = 1;
        } else if (parseInt(e.target.value) < 0) {
            term.value = 0;
        }
        objectiveFunction = objectiveFunction;
    }

    startup();
</script>

<h1>定式化について学ぼう！</h1>
<h2>つかいかた</h2>

<main>
    <table>
        <thead>
            <th>目的変数名</th>
            <th>最大</th>
            <th>QUBOの式化</th>
            <th>バイナリ変数の値</th>
            <th>計算結果</th>
            <th>目的関数の係数</th>
        </thead>
        <tbody>
            {#each objectiveFunction.terms as term }
                <tr>
                    <th>x{term.rv.index}</th>
                    <td>
                        <input
                            type="number"
                            bind:value={term.rv.max}
                            on:input={() => {
                                objectiveFunction = objectiveFunction;
                            }}
                        />
                    </td>
                    <td>
                        {term.rv.expandQubo()}
                    </td>

                    <td>
                        {#each term.rv.terms as term}
                            q{term.index}
                            <input
                                type="number"
                                bind:value={term.value}
                                on:input={(e)=>{ontermchange(e,term)}}
                            />
                        {/each}
                    </td>
                    <td>
                       <p>{term.rv.value}</p> 
                    </td>
                    <td>
                            <input
                                type="number"
                                bind:value={term.coef}
                                on:input={(e)=>{ontermchange(e,term)}}
                            />                        
                            
                    </td>
                </tr>
            {/each}
            <tr>
                <button
                    on:click={() => {
                        objectiveFunction.addResponseVariable();
                        objectiveFunction = objectiveFunction;
                    }}>+</button
                >
            </tr>
        </tbody>
    </table>

    <div>
        <dl class="objective-function">
           <dt>目的関数</dt> 
           <dd><p > {objectiveFunction.expand()} </p></dd>
           <dt>目的関数(QUBO)</dt> 
           <dd><p > {objectiveFunction.expandQubo()} </p></dd>
            <dt>目的関数(QUBO)展開</dt> 
           <dd><p > {objectiveFunction.expandQubo2()} </p></dd>
           <dt>目的関数の計算結果</dt>
           <dd><p>{objectiveFunction.value()}</p></dd>
        </dl>
        
    </div>
</main>

<style>
    .objective-function {
        border: 1px solid rgb(0,0,0);
        font-size: 1rem;
        font-weight: bold;
    }

    table {
        border: 1px solid rgb(0, 0, 0);
    }

    table th {
        border: 1px solid rgb(0, 0, 0);
    }

    table td {
        border: 1px solid rgb(0, 0, 0);
    }

    table input {
        width: 4rem;
    }
</style>
