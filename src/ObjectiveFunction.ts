import { ResponseVariable } from "./ResponseVariable";

type Term = {
    rv: ResponseVariable;
    coef: number
}

export class ObjectiveFunctions {
    terms : Term[];
    
    constructor(){
        this.terms = [];
    }

    addResponseVariable(){
        const rvs = this.terms;
        rvs.push({rv:new ResponseVariable(rvs.length,
            rvs.length > 0 ? rvs[rvs.length - 1].rv : undefined
            ), coef:1});
    }

    get responseVariable() {
        return this.terms.map(term=>term.rv);
    }

    expand() {
        return this.terms.map(term=> `${term.coef} × x${term.rv.index}` ).join(" + ");
    }

    value() {
        return this.terms.map(term=>term.coef * term.rv.value).reduce((a,b)=> a + b, 0);
    }
}